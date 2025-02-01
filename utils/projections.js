export const defaultPlayerProjection = {
    _id: 0,
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
    _id: 0,
    member: {
        allyCode: 1,
        playerName: 1,
        memberLevel: 1,
        galacticPower: 1,
        playerId: 1,
        raidScore: 1
    },
    profile: {
        id: 1,
        name: 1,
        externalMessageKey: 1
    },
    recentRaidResult: {
        endTime: 1,
        guildRewardScore: 1
    }
}

export const defaultPlayerArenaProjection = {_id: 0, allyCode: 1, pvpProfile: 1}

export const defaultUnitProjection = {_id: 0, baseId: 1, combatType: 1, forceAlignment: 1, nameKey: 1, categoryId: 1, thumbnailName: 1, crew: 1}

export const defaultCategoryProjection = {_id: 0, id: 1, descKey: 1, uiFilter: 1, visible: 1}

export const defaultCurrencyProjection = {_id: 0}

export const defaultMaterialProjection = {_id: 0, id: 1, nameKey: 1, iconKey: 1, rarity: 1}

export const defaultEquipmentProjection = {_id: 0, id: 1, mark: 1, nameKey: 1, iconKey: 1, tier: 1}

export const defaultPlayerPortraitProjection = {_id: 0, id: 1, icon: 1}

export const defaultSkillProjection = {
    _id: 0,
    id: 1,
    isZeta: 1,
    omicronMode: 1,
    zetaTier: {
        $cond: {
            if: {
                $eq: ['$isZeta', false]
            },
            then: 0,
            else: '$tier.isZetaTier'
        }
    },
    omicronTier: {
        $cond: {
            if: {
                $eq: ['$omicronMode', 1]
            },
            then: 0,
            else: '$tier.isOmicronTier'
        }
    }
}
//{$eq: ['$omicronMode', 1]}
// TODO maybe use redact to remove tier
// {
//     $redact: {
//       $cond: {
//         if: { $eq: [ "$skill_score", 0 ] },
//         then: '$$PRUNE',
//         else: '$$DESCEND'
//       }
//     }
//   }

export const defaultDatacronSetProjection = {_id: 0, id: 1, displayName: 1, expirationTimeMs: 1, icon: 1}

export const defaultDatacronTemplateProjection = {_id: 0, id: 1, setId: 1, referenceTemplateId: 1, tier: {affixTemplateSetId: 1}}

export const defaultDatacronAffixTemplateSetProjection = {_id: 0, id: 1, affix: {tag: 1, abilityId: 1, targetRule: 1, statType: 1}}

export const defaultBattleTargetingRuleProjection = {_id: 0, id: 1, category: {category: 1}}

export const defaultAbilityProjection = {_id: 0, id: 1, descKey: 1, nameKey: 1, icon: 1}