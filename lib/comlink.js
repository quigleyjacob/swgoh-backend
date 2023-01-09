import fetch from 'node-fetch'
import { isJSON } from './validation.js'

class Comlink {

    constructor() {
        this.url = 'https://swgoh-comlink-prod-swgoh-itd0v3.mo6.mogenius.io'
    }
     
    async getPlayer(payload) {
        let body = {
            'payload': payload
        }
        let response = await fetch(`${this.url}/player`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json'},
            body: JSON.stringify(body)
        })
        if(response.ok && isJSON(response)) {
            console.log(`player retrieved ${JSON.stringify(payload)}`)
            return {success: true, response: await response.json()}
        } else {
            console.log(`Error retrieving player ${JSON.stringify(payload)}`)
            return {success: false, response: await response.text()}
        }
    }

    async getGuild(allyCode) {
        let res = await this.getPlayer({"allyCode": allyCode})
        if(res.success) {
            let guildId = res.response.guildId
            console.log(`Guild found: ${guildId}`)
            let body = {
                "payload": {
                    "guildId": `${guildId}`,
                    "includeRecentGuildActivityInfo": true
                }
            }
            return await fetch(`${this.url}/guild`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json'},
                body: JSON.stringify(body)
            })
            .then(async response => {
                if(response.ok && isJSON(response)) {
                    return {success: true, response: await response.json()}
                } else {
                    return {success: false, response: await response.text()}
                }
            })
        } else {
            return {success: false, response: "Could not find player with given allyCode."}
        }
    }

    async getMetaData() {
        let result = await fetch(`${this.url}/metadata`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'}
        }).then(res => res.json())
        
        return result
    }

    async getUnits() {
        let metaData = await this.getMetaData()
        let body = {
            "payload": {
                "version": metaData['latestGamedataVersion'],
                "includePveUnits": true,
                "requestSegment": 3
            }
        }
        let result = await fetch(`${this.url}/data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        }).then(res => res.json())
        return result['units']
    }

    async getLocalization() {
        let metaData = await this.getMetaData()
        let body = {
            "payload": {
                "id": metaData['latestLocalizationBundleVersion']
            },
            "unzip": false
        }
        let result = await fetch(`${this.url}/localization`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        }).then(res => res.json())
        return result
    }
}

export default new Comlink()



