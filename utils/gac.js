import PlayerArena from '../lib/database/player/playerArena.js'
import { MyError } from './error.js'

function getBoardStatusForPlayer(playerStatus, away = false) {
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
                    unit.isAlive = true
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

export async function formatMhannGacBoard(gacBoard, allyCode) {
    if(!gacBoard.activeMatch) {
        throw new MyError(400, 'There is no current GAC data.')
    }
    let opponentAllyCode = await PlayerArena.getAllyCodeFromPlayerId(gacBoard.activeMatch.opponent.id)
    // return opponentAllyCode
    let mode = gacBoard.activeMatch.tournamentMapId.includes('5v5') ? 5 : 3
    // return {mode}
    let league = gacBoard.activeMatch.opponent.leagueId
    // return league
    let zones = gacBoard.activeMatch.homeStatus.duelStatus.map(zone => zone.zoneStatus.zoneId)
    // return zones
    let homeStatus = getBoardStatusForPlayer(gacBoard.activeMatch.homeStatus)
    // return homeStatus
    let awayStatus = getBoardStatusForPlayer(gacBoard.activeMatch.awayStatus, true)
    return {
        mode,
        league,
        opponent: {
            allyCode: opponentAllyCode,
            name: gacBoard.activeMatch.opponent.name
        },
        player: {
            allyCode
        },
        zones,
        homeStatus,
        awayStatus
    }
}

export function mergeGACPlans(oldGacPlan, newGacPlan) {
    for(const owner of ['homeStatus', 'awayStatus']) {
        for (const squadId of Object.keys(newGacPlan.homeStatus)) {
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
                    let oldUnit = oldGacPlan[owner][squadId].squad[index]
                    return {...oldUnit, ...unit}
                })
                oldGacPlan[owner][squadId].datacron = newSquadData.datacron
            }
        }
    }
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