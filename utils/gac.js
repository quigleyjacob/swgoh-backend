import DB from '../lib/database.js'
import { MyError } from './error.js'

function getBoardStatusForPlayer(playerStatus) {
    return playerStatus.duelStatus.reduce((obj, duel) => {
        let squadsInZone = duel?.warSquad || [] //could be empty, like if zone is not open

        squadsInZone.forEach(warSquad => {
            let squadId = warSquad.squadId
            let squad = warSquad.squad.cell
            .sort((a,b) => a.cellIndex - b.cellIndex)
            .map(cell => {return {baseId: cell.unitDefId.split(':')[0]}})
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
    let opponentAllyCode = await DB.getAllyCodeFromPlayerId(gacBoard.activeMatch.opponent.id)
    // return opponentAllyCode
    let mode = gacBoard.activeMatch.tournamentMapId.includes('5v5') ? 5 : 3
    // return {mode}
    let league = gacBoard.activeMatch.opponent.leagueId
    // return league
    let zones = gacBoard.activeMatch.homeStatus.duelStatus.map(zone => zone.zoneStatus.zoneId)
    // return zones
    let homeStatus = getBoardStatusForPlayer(gacBoard.activeMatch.homeStatus)
    // return homeStatus
    let awayStatus = getBoardStatusForPlayer(gacBoard.activeMatch.awayStatus)
    return {
        mode,
        league,
        opponent: {
            allyCode: opponentAllyCode
        },
        player: {
            allyCode
        },
        zones,
        homeStatus,
        awayStatus
    }
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