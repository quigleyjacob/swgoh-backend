import fetch from 'node-fetch'
import { load } from 'cheerio'
import DB from './database/database.js'
import RateLimiter, {RequestRequestHandler} from 'request-rate-limiter'

const limiter = new RateLimiter({
    backoffTime: 10,
    requestRate: 60,
    interval: 60,
    timeout: 600
})
limiter.setRequestHandler(new RequestRequestHandler({
    backoffHTTPCode: 402
}))

class GG {

    constructor () {
        this.firstGAC = 31;
    }

    getCharacterSquad($, elem) {
        let leader = $(elem).find('.gac-squad__leader .gac-unit .gac-unit__portrait .gac-unit-portrait .character-portrait').attr('title')
        let members = [leader]
        $(elem).find('.gac-squad__units .gac-squad__members .gac-unit').each((i, elem) => {
            let member = $(elem).find('.gac-unit__portrait .character-portrait').attr('title')
            members.push(member)
        })
        return members
    }

    getShipSquad($, elem) {
        let leader = $(elem).find('.gac-squad__leader .gac-unit .gac-unit__portrait .gac-unit-portrait .ship-portrait').attr('title')
        let members = [leader]
        $(elem).find('.gac-squad__units .gac-squad__members .gac-unit').each((i, elem) => {
            let member = $(elem).find('.gac-unit__portrait .ship-portrait').attr('title')
            members.push(member)
        })
        $(elem).find('.gac-squad__units .gac-squad__reinforcements .gac-unit').each((i, elem) => {
            let member = $(elem).find('.gac-unit__portrait .ship-portrait').attr('title')
            members.push(member)
        })
        return members
    }

    getDatacrons($, elem) {
        let datacron = $(elem).find('.gac-squad__datacron .datacron-icon').attr('data-player-datacron-tooltip-app')
        return datacron ? JSON.parse(datacron).set_id : 0
    }

    getGACData($, allyCode, gacNumber, roundNumber) {
        const results = []
        $('.gac-player-battles .row').each((index, elt) => {
            let win = $(elt).find('.col-md-4 .panel .gac-summary__status').contents().text().replaceAll('\n', '')
            let banners = win === 'WIN' ? Number(String($(elt).find('.col-md-4 .panel').contents().filter(() => this.type === 'text').prevObject['9'].data).replace('Banners: ', '').replace('\n', '')) : 0

            let squads = []
            let datacrons = []
            let toon 
            $(elt).find('.col-md-8 .gac-squad').each((i, elem) => {
                toon = $(elem).find('.gac-squad__leader .gac-unit .gac-unit__portrait .gac-unit-portrait--type-1').length > 0
                if(toon) {
                    squads.push(this.getCharacterSquad($, elem))
                    datacrons.push(this.getDatacrons($, elem))
                } else {
                    squads.push(this.getShipSquad($, elem))
                }
            })
            results.push({
                win: win === 'WIN',
                allyCode: allyCode,
                gacNumber: gacNumber,
                roundNumber: roundNumber,
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

    async scrapeGGReport(allyCode, gacNumber, roundNumber) {
        let response = await limiter.request(`https://swgoh.gg/p/${allyCode}/gac-history?gac=${gacNumber}&r=${roundNumber}`)
        if(response.statusCode === 200) {
            const $ = load(response.body)
            return this.getGACData($, allyCode, gacNumber, roundNumber)
        } else {
            console.log(response.statusCode)
            throw new Error(`Unable to get GG Report [allyCode=${allyCode},gacNumber=${gacNumber},roundNumber=${roundNumber}]`)
        }
    }

    async getLatestGacNumber() {
        let response = await fetch('https://swgoh.gg/p/134232169/gac-history/', {method: 'GET'})
        if(response.ok) {
            const $ = load(await response.text())
            let latest = $('.content-container-primary .list-group .list-group-item .dropdown-menu li a').first().attr('href')?.replace('?gac=', '')
            return {"latest": Number(latest)}
        } else {
            throw 'Unable to get latest GAC number.'
        }
    }

    async insertGACHistory(allyCode, gacNumber, roundNumber, report={added:0,failed:0}) {
        try {
            let reports = await this.scrapeGGReport(allyCode, gacNumber, roundNumber)
            if(reports.length > 0) {
                DB.addGGReports(reports)
            } else {
                console.log(gacNumber, roundNumber)
            }
            
            report.added += 1
            return `GAC Data Added [gacNumber=${gacNumber},roundNumber=${roundNumber}]`
        } catch(err) {
            console.log(err)
            report.failed += 1
            return `Cannot add GAC Data [gacNumber=${gacNumber},roundNumber=${roundNumber}]`
        }
    }

    async addEntireHistory(allyCode) {
        let { latest } = await this.getLatestGacNumber()
        let report = {
            added: 0,
            failed: 0
        }

        for(const gacNumber of range(this.firstGAC, latest)) {
            await this.insertGACHistory(allyCode, gacNumber, 1, report)
            await this.insertGACHistory(allyCode, gacNumber, 2, report)
            await this.insertGACHistory(allyCode, gacNumber, 3, report)
        }

        return `Reports added [${JSON.stringify(report)}]`
    }

    async getGACBattles(mode, combatType, allyCode, win) {
        return DB.getGGReports(mode, combatType, allyCode, win)
    }

}

function range(start, end) {
    return [...Array(end-start+1).keys()].map(i => i + start)
}

export default new GG()