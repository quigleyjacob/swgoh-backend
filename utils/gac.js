import PlayerArena from '../lib/database/player/playerArena.js'
import { MyError } from './error.js'

function getBoardStatusForPlayer(playerStatus, away = false, setIsAliveFromInGame = false) {
    if(playerStatus === null) {
        return {}
    }
    return playerStatus.duelStatus.reduce((obj, duel) => {
        let squadsInZone = duel?.warSquad || [] //could be empty, like if zone is not open

        squadsInZone.forEach(warSquad => {
            let hasPreloadData = warSquad.successfulDefends > 0
            let squadId = warSquad.squadId
            let squad = warSquad.squad.cell
            .sort((a,b) => a.cellIndex - b.cellIndex)
            .map(cell => {
                let unit = { baseId: cell.unitDefId.split(':')[0]}
                if(hasPreloadData) {
                    unit.unitState = cell.unitState
                }
                if(away) {
                    unit.isAlive = setIsAliveFromInGame ? Number(cell.unitState.healthPercent) > 0 : true
                }
                return unit
            })
            let datacron = warSquad?.squad?.datacron?.id || undefined
            obj[squadId] = {
                squad,
                datacron
            }
        })

        return obj
    }, {})
}

function getDefensePhaseForPlayer(zoneDefense, zones) {
    let obj = {}
    for (let [i, zone] of zoneDefense.entries()) {
        for(let [j, defensiveSquad] of zone.defensiveSquad.entries()) {
            let key = `Auto-${zones[i]}_squad${j}`
            let datacron = defensiveSquad.datacronId
            let squad = defensiveSquad.defensiveSquadUnit.map(unit => {
                return {baseId: unit.unitBaseId}
            })
            obj[key] = {datacron, squad}
        }
    }
    return obj
}

export async function formatMhannGacBoard(gacBoard, allyCode, setIsAliveFromInGame=false) {
    if(!gacBoard?.matchStatus?.length === 0) {
        throw new MyError(400, 'There is no current GAC data.')
    }
    let currentGacBoard = gacBoard.matchStatus.at(-1)
    let opponentAllyCode = await PlayerArena.getAllyCodeFromPlayerId(currentGacBoard.opponent.id)
    // return opponentAllyCode
    let mode = currentGacBoard.tournamentMapId.includes('5v5') ? 5 : 3
    // return {mode}
    let league = currentGacBoard.opponent.leagueId
    // return league
    let zones = currentGacBoard.homeStatus.duelStatus.map(zone => zone.zoneStatus.zoneId)
    // return zones
    let homeStatus, awayStatus
    if(currentGacBoard.awayStatus === null) {
        if(!gacBoard.territoryDefense) {
            throw new MyError(400, 'Unable to format GAC board. You may have to wait until attack phase.')
        }
        // defense phase, get home status from territory defense. opponent is empty
        let zoneDefense = gacBoard.territoryDefense.find(elt => elt.savedSquadConfigId.includes(mode)).zoneDefense
        homeStatus = getDefensePhaseForPlayer(zoneDefense, zones)
        awayStatus = {}
    } else {
        //offense phase, get both from status in current match
        homeStatus = getBoardStatusForPlayer(currentGacBoard.homeStatus)
        awayStatus = getBoardStatusForPlayer(currentGacBoard.awayStatus, true, setIsAliveFromInGame)
    }

    return {
        mode,
        league,
        opponent: {
            allyCode: opponentAllyCode,
            name: currentGacBoard.opponent.name
        },
        player: {
            allyCode
        },
        zones,
        homeStatus,
        awayStatus,
        tournamentEventId: gacBoard.tournamentEventId,
        currentMatchId: gacBoard.matchStatus.length
    }
}

export function mergeGACPlans(oldGacPlan, newGacPlan) {
    for(const owner of ['homeStatus', 'awayStatus']) {
        for (const squadId of Object.keys(newGacPlan[owner])) {
            let newSquadData = newGacPlan[owner][squadId]
            if(newSquadData === undefined && oldGacPlan[owner][squadId] === undefined) {
                continue
            }
            if(oldGacPlan[owner][squadId] === undefined) {
                oldGacPlan[owner][squadId] = newSquadData
                if(owner === 'awayStatus') {
                    oldGacPlan[owner][squadId].squad.forEach(unit => {
                        unit.isAlive = true
                    })
                }
            } else {
                oldGacPlan[owner][squadId].squad = newSquadData.squad.map((unit, index) => {
                    let oldUnit = oldGacPlan[owner][squadId].squad[index] || {isAlive: true}
                    // console.log(oldUnit, unit)
                    return {...unit, isAlive: oldUnit.isAlive}
                })
                oldGacPlan[owner][squadId].datacron = newSquadData.datacron
            }
        }
    }
    oldGacPlan.time = newGacPlan.time
    oldGacPlan.updatedAt = newGacPlan.updatedAt
    return oldGacPlan
}

function getSquads(board) {
    let map = {}
    board.zones.forEach(zone => {
        let zoneId = zone.zoneId
        if(zone.squads.length) {
            zone.squads.forEach((squadData, index) => {
                let squadId = `Auto-${zoneId}_squad${index}`
                let squad = squadData.units.map(unit => {
                    return {baseId: unit.baseId}
                })
                let datacron = squadData?.datacron?.id
                map[squadId] = {
                    squad,
                    datacron
                }
            })
        }
    })
    return map
}

export async function formatHotUtilsGacBoard(gacBoard, allyCode) {
    return {
        league: gacBoard.gac.groupId.split(':')[2],
        mode: gacBoard.gac.tournamentMapId.includes('5v5') ? 5 : 3,
        opponent: {
            allyCode: String(gacBoard.gac.away.player.allyCode)
        },
        player: {
            allyCode
        },
        zones: gacBoard.gac.home.zones.map(zone => zone.zoneId),
        homeStatus: getSquads(gacBoard.gac.home),
        awayStatus: getSquads(gacBoard.gac.away),
    }
}

function updateFetchParameters(parameters, location, key, value) {
    switch(location) {
        case 'query':
            parameters.endpoint += (parameters.endpoint.includes('?') ? '&' : '?') + `${key}=${value}`
            break
        case 'body':
            if(parameters.body) {
                parameters.body[key] = value
            } else {
                parameters.body = {
                    key: value
                }
            }
            break
        case 'path':
            parameters.endpoint = parameters.endpoint.replace(`:${key}`, value)
            break
        case 'header':
            if(parameters.headers) {
                parameters.headers[key] = value
            } else {
                parameters.headers = {
                    key: value
                }
            }
            break
        default:
            throw new MyError(400, 'Invalid allyCodeLocation in GAC endpoint settings')
    }
}

export async function loadGACBoardFromCustomEndpoint(gacEndpoint, allyCode) {
    const parameters = {
        endpoint: gacEndpoint.url,
    }

    updateFetchParameters(parameters, gacEndpoint.allyCodeLocation, gacEndpoint.key, allyCode)
    ;(gacEndpoint.optionalSettings || []).forEach(row => {
        updateFetchParameters(parameters, row.location, row.key, row.value)
    })

    const endpoint = parameters.endpoint
    const options = {
        method: gacEndpoint.method
    }
    if(parameters.headers) {
        options.headers = parameters.headers
    }
    if(parameters.body) {
        options.body = JSON.stringify(parameters.body)
    }

    console.log(`Fetching GAC data from custom endpoint: ${endpoint} with options: ${JSON.stringify(options)}`)

    try {
        let response = await fetch(endpoint, options)
        if(!response.ok) {
            throw new MyError(400, `Error fetching GAC data from custom endpoint: ${response.status} ${response.statusText}`)
        }
        return response.json()
    } catch (error) {
        if(error instanceof MyError) {
            throw error
        }
        throw new MyError(500, `Failed to fetch GAC data from custom endpoint: ${error.message}`)
    }
}