
// take POW affix from his template and add to base template, then remove POW template
export function handlePOWTemplate(activeTemplates) {
    let powTemplate = activeTemplates.find(template => template.id === 'datacron_set_15_padawanobiwan')
    let powCharacterBonus = powTemplate.tier[8].affixTemplateSetId[0]

    let baseTemplate = activeTemplates.find(template => template.id === 'datacron_set_15_base')
    baseTemplate.tier[8].affixTemplateSetId.push(powCharacterBonus)

    // delete POW template
    let indexToRemove = activeTemplates.indexOf(template => template.id === 'datacron_set_15_padawanobiwan')
    activeTemplates.splice(indexToRemove, 1)
}

export function getTags(affix) {
    switch(affix.abilityId) {
        case 'datacron_character_padawanobiwan_001':
        case 'datacron_character_padawanobiwan_002':
        case 'datacron_character_padawanobiwan_003':
            return ['lightside', 'galacticrepublic']
        default:
            return affix.tag
    }
}