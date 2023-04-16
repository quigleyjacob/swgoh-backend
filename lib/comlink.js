import fetch from 'node-fetch'
import { validateResponse } from './validation.js'

class Comlink {

    constructor() {
        this.url = 'https://swgoh-comlink-prod-swgoh-itd0v3.mo6.mogenius.io'
    }
     
    // can get player either by their Id or by allyCode, need to have payload to accommodate both
    async getPlayer(payload) {
        let body = {
            'payload': payload
        }
        let response = await fetch(`${this.url}/player`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json'},
            body: JSON.stringify(body)
        })

        return validateResponse(response, `Error retrieving player from Comlink`)
    }

    async getGuild(guildId) {
        let body = {
            "payload": {
                "guildId": guildId,
                "includeRecentGuildActivityInfo": true
            }
        }
        let response = await fetch(`${this.url}/guild`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json'},
            body: JSON.stringify(body)
        })

        return validateResponse(response, `Error getting guild from Comlink [${guildId}]`)
    }

    async getMetaData() {
        let response = await fetch(`${this.url}/metadata`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'}
        })

        return validateResponse(response, "Error retrieving metadata from Comlink")
    }

    async getUnits() {
        return (await this.getGameData(3))['units']
    }

    async getRelicTierDefinition() {
        return (await this.getGameData(3))['relicTierDefinition']
    }

    async getTable() {
        return (await this.getGameData(1))['table']
    }

    async getRecipe() {
        return (await this.getGameData(2))['recipe']
    }

    async getStatProgression() {
        return (await this.getGameData(2))['statProgression']
    }

    async getXpTable() {
        return (await this.getGameData(1))['xpTable']
    }

    async getDatacronData() {
        let data = await this.getGameData(4)
        let objects = ['datacronSet', 'datacronTemplate', 'datacronAffixTemplateSet']
        return objects
        .map(object => {
            return {key: object, value: data[object]}
        })
    }

    async getBattleTargetingRule() {
        return (await this.getGameData(1))['battleTargetingRule']
    }

    async getGameData(requestSegment) {
        let metaData = await this.getMetaData()
        let body = {
            "payload": {
                "version": metaData['latestGamedataVersion'],
                "includePveUnits": true,
                "requestSegment": requestSegment
            }
        }
        let response = await fetch(`${this.url}/data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })
        return validateResponse(response, "Error retrieving game data from Comlink.")
    }

    async getLocalization() {
        let metaData = await this.getMetaData()
        let body = {
            "payload": {
                "id": metaData['latestLocalizationBundleVersion']
            },
            "unzip": false
        }
        let response = await fetch(`${this.url}/localization`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })
        return validateResponse(response, "Error retrieving localization bundle from Comlink.")
    }

    async getUnitGameData() {
        let gameData = await this.getGameData(1)
        return gameData
    }
}

export default new Comlink()



