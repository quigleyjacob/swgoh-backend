export function zetaCount(unit, skillMap) {
    return unit.skill.reduce((num, {id, tier}) => {
        let skill = skillMap[id]
        if(skill.isZeta) {
            return num + (skill.zetaTier[tier] ? 1 : 0)
        } else {
            return num + 0
        }
    }, 0)
}

export function omicronCount(unit, skillMap) {
    return unit.skill.reduce((num, {id, tier}) => {
        let skill = skillMap[id]
        if(skill.omicronMode > 1) {
            return num + (skill.omicronTier[tier] ? 1 : 0)
        } else {
            return num + 0
        }
    }, 0)
}

export function populateRoster(unitsMap, player) {
    player.rosterUnit.forEach(unit => {
        let match = new RegExp("^([A-Z0-9_]+):[A-Z_]+$", "g").exec(unit.definitionId)
        if(match) {
            let defId = match[1]
            unit.defId = defId
            let unitDetails = unitsMap[defId]
            unit.nameKey = unitDetails.nameKey
            unit.combatType = unitDetails.combatType
        }
    })
}