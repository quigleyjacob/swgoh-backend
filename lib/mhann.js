import fetch from 'node-fetch'
import { validateMhannResponse } from './validation.js'
import { config } from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from "url"

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

    async getUserInventory(allyCode) {
        let body = {
            payload: {
                allyCode: allyCode
            }
        }
        let response = await fetch(`${this.url}/api/inventory`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'api-key': this.apiKey},
            body: JSON.stringify(body)
        })

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
                allyCode: allyCode
            }
        }
        let response = await fetch(`${this.url}/api/authstatus`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'api-key': this.apiKey},
            body: JSON.stringify(body)
        })

        let message = await validateMhannResponse(response, 'Error retrieving AuthStatus from Mhann service.', 'message')

        return message
    }

    async getCurrentGACBoard(allyCode) {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        return JSON.parse(fs.readFileSync(path.resolve(__dirname, '../mockData/mhannGacBoard.json'), 'utf8'))
        let body = {
            payload: {
                allyCode: allyCode
            }
        }
        let response = await fetch(`${this.url}/api/gac`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'api-key': this.apiKey},
            body: JSON.stringify(body)
        })

        return await validateMhannResponse(response, 'Error retrieving AuthStatus from Mhann service.', 'gacData')
    }

}

export default new Mhann()
