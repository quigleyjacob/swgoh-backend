
// take POW affix from his template and add to base template, then remove POW template
export function handlePOWTemplate(activeTemplates) {
    handleCharacterTemplate(activeTemplates, 'datacron_set_15_padawanobiwan', 'datacron_set_15_base')
//     let powTemplate = activeTemplates.find(template => template.id === 'datacron_set_15_padawanobiwan')
//     let powCharacterBonus = powTemplate.tier[8].affixTemplateSetId[0]

//     let baseTemplate = activeTemplates.find(template => template.id === 'datacron_set_15_base')
//     baseTemplate.tier[8].affixTemplateSetId.push(powCharacterBonus)

//     const getIndexOfCharacterTemplate = (template) => {
//         console.log(template.id === 'datacron_set_15_padawanobiwan')
//         return template.id === 'datacron_set_15_padawanobiwan'
// }

//     // delete POW template
//     // let indexToRemove = activeTemplates.indexOf(getIndexOfCharacterTemplate)
//     activeTemplates = activeTemplates.filter(template => template.id !== 'datacron_set_15_padawanobiwan')
}

export function handleNightTrooperTemplate(activeTemplates) {
    handleCharacterTemplate(activeTemplates, 'datacron_set_16_nighttrooper', 'datacron_set_16_base')
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