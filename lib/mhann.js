import fetch from 'node-fetch'
import { validateMhannResponse } from './validation.js'
import { config } from 'dotenv'
import crypto from 'crypto';
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
                allyCode: allyCode
            }
        }
        let response = await this._fetch('/api/authstatus', body)

        let message = await validateMhannResponse(response, 'Error retrieving AuthStatus from Mhann service.', 'message')

        return message
    }

    async getCurrentGACBoard(allyCode) {
        // const __filename = fileURLToPath(import.meta.url);
        // const __dirname = path.dirname(__filename);
        // return JSON.parse(fs.readFileSync(path.resolve(__dirname, '../mockData/mhannGacBoard.json'), 'utf8'))
        let body = {
            payload: {
                allyCode: allyCode
            }
        }
        let response = await this._fetch('/api/gac', body)

        return await validateMhannResponse(response, 'Error retrieving AuthStatus from Mhann service.', 'gacData')
    }

    async _fetch(endpoint, body, method = 'POST') {
        let headers = { 
            'Content-Type': 'application/json', 
            ...this.generateHMAC(this.apiKey, method, body, endpoint)
        }
        return await fetch(`${this.url}${endpoint}`, {
            method,
            headers,
            body: JSON.stringify(body)
        })
    }

    generateHMAC(apiKey, method, payload, endpoint) {
        // Generate Unix epoch time in milliseconds
        const timestamp = Date.now();

        // Create a base HMAC object using SHA256 algorithm
        const hmac = crypto.createHmac('sha256', apiKey);

        // Add the request timestamp to the HMAC object
        hmac.update(timestamp.toString());

        // Add the HTTP method (in upper case) to the HMAC object
        hmac.update(method.toUpperCase());

        // Add the API endpoint URI (in lower case) to the HMAC object
        hmac.update(endpoint.toLowerCase());

        // Create a serialized string from the payload JSON
        const payloadString = JSON.stringify(payload);

        // Generate MD5 hash of the payload string
        const payloadHash = crypto
        .createHash('md5')
        .update(payloadString)
        .digest('hex');

        // Add the payload hash to the HMAC object
        hmac.update(payloadHash);

        // Calculate the HMAC signature
        const HMACSignature = hmac.digest('hex');

        // Return the HMAC signature and timestamp
        return {'x-timestamp': timestamp, Authorization: HMACSignature};
    }

}

export default new Mhann()
