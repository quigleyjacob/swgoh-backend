export function getBoardStatusForPlayer(playerStatus) {
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