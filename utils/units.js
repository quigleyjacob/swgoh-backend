export function zetaCount(unit, skillMap) {
    return unit.skill.reduce((num, {id, tier}) => {
        let skill = skillMap[id]
        if(skill === undefined) {
            return 0
        }
        let zetaTier = skill.zetaTier.indexOf(true)
        // not a zeta, not going to add
        if(zetaTier === -1) {
            return num
        }
        // only add if unit has at least the zeta tier
        let hasZeta = tier >= zetaTier
        return num + (hasZeta ? 1 : 0)
    }, 0)
}

export function omicronCount(unit, skillMap) {
    return unit.skill.reduce((num, {id, tier}) => {
        let skill = skillMap[id]
        if(skill === undefined) {
            return 0
        }
        if(skill.omicronMode > 1) {
            return num + (skill.omicronTier[tier] ? 1 : 0)
        } else {
            return num + 0
        }
    }, 0)
}

export function buildUnitOmicronSummary(unit, skillMap) {
    const activated = {}
    const missing = {}
    let activatedCount = 0

    for (const { id, tier } of unit.skill) {
        const skill = skillMap[id]
        if (!skill) continue

        const mode = skill.omicronMode
        if (mode <= 1) continue

        const isActive = skill.omicronTier?.[tier] === true

        if (isActive) {
            activatedCount++
            if (!activated[mode]) activated[mode] = []
            activated[mode].push(id)
        } else {
            if (!missing[mode]) missing[mode] = []
            missing[mode].push(id)
        }
    }

    return {
        omicronCount: activatedCount,
        activatedByMode: activated,
        missingByMode: missing
    }
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