import fetch from 'node-fetch'
import { validateResponse } from './validation.js'

class Comlink {

    constructor() {
        this.url = 'https://deploy-swgoh-comlink-production.up.railway.app'
        this.statsURL = 'https://swgoh-stats-production.up.railway.app'
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

    async getPlayerWithStats(payload) {
        let playerData = await this.getPlayer(payload)

        let response = await fetch(`${this.statsURL}/api?flags=calcGP,gameStyle,statIDs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(playerData.rosterUnit)
        })

        let rosterWithStats = await validateResponse(response, `Error retrieving player stats from stat calculator.`)
        playerData.rosterUnit = rosterWithStats
        return playerData
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

    async getUnits(latestGamedataVersion = undefined) {
        return (await this.getGameData(3, latestGamedataVersion))['units']
    }

    async getRelicTierDefinition(latestGamedataVersion = undefined) {
        return (await this.getGameData(3, latestGamedataVersion))['relicTierDefinition']
    }

    async getTable(latestGamedataVersion = undefined) {
        return (await this.getGameData(1, latestGamedataVersion))['table']
    }

    async getRecipe(latestGamedataVersion = undefined) {
        return (await this.getGameData(2, latestGamedataVersion))['recipe']
    }

    async getStatProgression(latestGamedataVersion = undefined) {
        return (await this.getGameData(2, latestGamedataVersion))['statProgression']
    }

    async getXpTable(latestGamedataVersion = undefined) {
        return (await this.getGameData(1, latestGamedataVersion))['xpTable']
    }

    async getDatacronData(latestGamedataVersion = undefined) {
        let data = await this.getGameData(4, latestGamedataVersion)
        let objects = ['datacronSet', 'datacronTemplate', 'datacronAffixTemplateSet']
        return objects
        .map(object => {
            return {key: object, value: data[object]}
        })
    }

    async getBattleTargetingRule(latestGamedataVersion = undefined) {
        return (await this.getGameData(1, latestGamedataVersion))['battleTargetingRule']
    }

    async getPlayerPortraitData(latestGamedataVersion = undefined) {
        return (await this.getGameData(1, latestGamedataVersion))['playerPortrait']
    }

    async getGameData(requestSegment, latestGamedataVersion = undefined) {
        let body = {
            "payload": {
                "version": latestGamedataVersion === undefined ? (await this.getMetaData())['latestGamedataVersion'] : latestGamedataVersion,
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

    async getLocalization(latestLocalizationBundleVersion = undefined) {
        let body = {
            "payload": {
                "id": latestLocalizationBundleVersion === undefined ? (await this.getMetaData())['latestLocalizationBundleVersion'] : latestLocalizationBundleVersion
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

    async getUnitGameData(latestGamedataVersion = undefined) {
        let gameData = await this.getGameData(1, latestGamedataVersion)
        return gameData
    }
}

export default new Comlink()



