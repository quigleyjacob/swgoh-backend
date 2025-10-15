import fetch from 'node-fetch'
import { validateMhannResponse } from './validation.js'
import { config } from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from "url"
import { getMhannHeaders } from '../utils/mhann.js';

config()

class Mhann {
    constructor() {
        this.url = process.env.REGISTRY_URL
        this.apiKey = process.env.REGISTRY_API_KEY
    }

    _validateResponseBody(body, fieldName) {
        if(success === 0) {
            return body[fieldName]
        }

    }

    async getUserInventory(allyCode, userDiscordId) {
        let body = {
            payload: {
                allyCode,
                userDiscordId,
                enums: false
            }
        }
        let response = await this._fetch('/api/inventory', body)

        let inventory = await validateMhannResponse(response, 'Error retrieving inventory data from Mhann service.', 'inventory')

        inventory.currency = inventory.currencyItem.map(({currency, ...rest}) => {
            return {
                id: currency,
                ...rest
            }
        })
        inventory.lastRefreshed = new Date()

        delete inventory.currencyItem

        delete inventory.unequippedMod

        return inventory
    }

    async getUserAuthStatus(allyCode) {
        let body = {
            payload: {
                allyCode,
                enums: false
            }
        }
        let response = await this._fetch('/api/authstatus', body)
        let message = await validateMhannResponse(response, 'Error retrieving AuthStatus from Mhann service.', 'message')

        return message
    }

    async getCurrentGACBoard(allyCode, userDiscordId) {
        // const __filename = fileURLToPath(import.meta.url);
        // const __dirname = path.dirname(__filename);
        // return JSON.parse(fs.readFileSync(path.resolve(__dirname, '../mockData/mhannGacBoard.json'), 'utf8'))
        console.log(userDiscordId)
        let body = {
            payload: {
                allyCode,
                enums: false
            }
        }
        let response = await this._fetch('/api/gac', body)

        return await validateMhannResponse(response, 'Error retrieving GAC Board from Mhann service.', 'gacData')
    }

    async _fetch(endpoint, body, method = 'POST') {
        return await fetch(`${this.url}${endpoint}`, {
            method,
            headers: getMhannHeaders(method, body, endpoint, this.apiKey),
            body: JSON.stringify(body)
        })
    }
}

export default new Mhann()
