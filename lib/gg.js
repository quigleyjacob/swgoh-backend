function getCharacterSquad($, elem) {
    let leader = $(elem).find('.gac-squad__leader .gac-unit .gac-unit__portrait .gac-unit-portrait .character-portrait').attr('title')
    let members = [leader]
    $(elem).find('.gac-squad__units .gac-squad__members .gac-unit').each(function(i, elem) {
        let member = $(elem).find('.gac-unit__portrait .character-portrait').attr('title')
        members.push(member)
    })
    return members
}

function getShipSquad($, elem) {
    let leader = $(elem).find('.gac-squad__leader .gac-unit .gac-unit__portrait .gac-unit-portrait .ship-portrait').attr('title')
    let members = [leader]
    $(elem).find('.gac-squad__units .gac-squad__members .gac-unit').each(function(i, elem) {
        let member = $(elem).find('.gac-unit__portrait .ship-portrait').attr('title')
        members.push(member)
    })
    $(elem).find('.gac-squad__units .gac-squad__reinforcements .gac-unit').each(function(i, elem) {
        let member = $(elem).find('.gac-unit__portrait .ship-portrait').attr('title')
        members.push(member)
    })
    return members
}

function getDatacrons($, elem) {
    let datacron = $(elem).find('.gac-squad__datacron .datacron-icon').attr('data-player-datacron-tooltip-app')
    return datacron ? JSON.parse(datacron).set_id : 0
}

export function getGACData($) {
    const results = []
    $('.gac-player-battles .row').each(function(index, elt) {
        // @ts-ignore
        let win = $(elt).find('.col-md-4 .panel .gac-summary__status').contents().text().replaceAll('\n', '')
        // @ts-ignore
        let banners = win === 'WIN' ? Number(String($(elt).find('.col-md-4 .panel').contents().filter(function() {return this.type === 'text'}).prevObject['9'].data).replace('Banners: ', '').replace('\n', '')) : 0

        let squads = []
        let datacrons = []
        let toon 
        $(elt).find('.col-md-8 .gac-squad').each(function(i, elem) {
            toon = $(elem).find('.gac-squad__leader .gac-unit .gac-unit__portrait .gac-unit-portrait--type-1').length > 0
            if(toon) {
                squads.push(getCharacterSquad($, elem))
                datacrons.push(getDatacrons($, elem))
            } else {
                squads.push(getShipSquad($, elem))
            }
        })
        results.push({
            win: win === 'WIN',
            combatType: toon ? 1 : 2,
            mode: toon ? squads[1].length : 0,
            banners: banners,
            allySquad: squads[0],
            enemySquad: squads[1],
            allyDatacron: datacrons[0],
            enemyDatacron: datacrons[1]
        })
    })
    return results
}