
export function handlePOWTemplate(activeTemplates) {
    handleCharacterTemplate(activeTemplates, 'datacron_set_15_padawanobiwan', 'datacron_set_15_base')
}

export function handleNightTrooperTemplate(activeTemplates) {
    handleCharacterTemplate(activeTemplates, 'datacron_set_16_nighttrooper', 'datacron_set_16_base')
}

export function handleGreatMothersTemplate(activeTemplates) {
    handleCharacterTemplate(activeTemplates, 'datacron_set_17_greatmothers', 'datacron_set_17_base')
}

export function getTags(affix) {
    switch(affix.abilityId) {
        case 'datacron_character_padawanobiwan_001':
        case 'datacron_character_padawanobiwan_002':
        case 'datacron_character_padawanobiwan_003':
            return ['lightside', 'galacticrepublic']
        case 'datacron_character_nighttrooper_001':
        case 'datacron_character_nighttrooper_002':
        case 'datacron_character_nighttrooper_003':
            return ['darkside', 'attacker']
        case 'datacron_character_greatmothers_001':
        case 'datacron_character_greatmothers_002':
        case 'datacron_character_greatmothers_003':
            return ['darkside', 'nightsister']
        default:
            return affix.tag
    }
}

function handleCharacterTemplate(activeTemplates, characterTemplateName, templateBaseName) {
    let template = activeTemplates.find(template => template.id === characterTemplateName)
    let characterBonus = template.tier[8].affixTemplateSetId[0]

    let baseTemplate = activeTemplates.find(template => template.id === templateBaseName)
    baseTemplate.tier[8].affixTemplateSetId.push(characterBonus)
}