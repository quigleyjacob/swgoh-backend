export const defaultPlayerProjection = {
    allyCode: 1,
    datacron: 1,
    gacPowerScore: 1,
    galacticPower: 1,
    guildId: 1,
    guildName: 1,
    lastActivityTime: 1,
    lastRefreshed: 1,
    modScore: 1,
    name: 1,
    playerRating: 1,
    pvpProfile: {
        rank: 1,
        squad: {
            cell: {
                unitDefId: 1
            }
        }
    },
    rosterUnit: {
        baseId: 1,
        definitionId: 1,
        currentRarity: 1,
        currentLevel: 1,
        currentTier: 1,
        zetaCount: 1,
        omicronCount: 1,
        relic: 1,
        gp: 1,
        stats: 1,
        purchasedAbilityId: 1
    },
    selectedPlayerPortrait: 1,
    selectedPlayerTitle: 1,
}

export const defaultGuildProjection = {
    member: {
        playerId: 1,
        playerName: 1,
        memberLevel: 1,
        galacticPower: 1
    },
    profile: {
        id: 1,
        name: 1,
        externalMessageKey: 1
    },
    recentRaidResult: {
        raidMember: {
            memberProgress: 1,
            playerId: 1
        },
        endTime: 1,
        guildRewardScore: 1
    }
}