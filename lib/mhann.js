import fetch from 'node-fetch'
import DB from './database.js'
import { validateMhannResponse } from './validation.js'
import { config } from 'dotenv'

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

}

export default new Mhann()
