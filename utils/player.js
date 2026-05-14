export function getPlayerIdListFromLeaderboard(leaderboard, key) {
    return leaderboard?.[key]?.leaderboard?.[0]?.player
        ?.filter(entry => !entry.isFake)
        ?.map(entry => entry.id)
        || []
}

export function replacePlayerIdWithAllyCode(leaderboard, playerIdToAllyCode, key) {
    let playerList = leaderboard?.[key]?.leaderboard?.[0]?.player
    if(playerList) {
        playerList.forEach(player => {
            player.allyCode = playerIdToAllyCode[player.id]
            delete player.id
        })
    }
}