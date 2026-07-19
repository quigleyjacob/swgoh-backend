import fetch from 'node-fetch'
import { validateMhannResponse } from './validation.js'
import { config } from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from "url"
import { getMhannHeaders, convertQuigToMhannDeployment, convertQuigToMhannCommands } from '../utils/mhann.js';

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

    async getActiveRaid(allyCode, userDiscordId) {
        let body = {
            payload: {
                allyCode,
                userDiscordId,
                enums: false
            }
        }
        let response = await this._fetch('/api/activeraid', body)
        return await validateMhannResponse(response, 'Error retrieving Active Raid data from Mhann service.', 'data')
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
        let body = {
            payload: {
                allyCode,
                userDiscordId,
                enums: false
            }
        }
        let response = await this._fetch('/api/gac', body)

        return await validateMhannResponse(response, 'Error retrieving GAC Board from Mhann service.', 'gacData')
    }

    async getTB(allyCode, userDiscordId) {
        let body = {
            payload: {
                allyCode,
                userDiscordId,
                enums: false
            }
        }

        let response = await this._fetch('/api/tb', body)

        return await validateMhannResponse(response, 'Error retrieving TB data from Mhann service.', 'territoryBattleStatus')
    }

    async getLeaderboard(allyCode, userDiscordId) {
        let body = {
            payload: {
                allyCode,
                userDiscordId,
                enums: false
            }
        }

        let response = await this._fetch('/api/leaderboard', body)

        return await validateMhannResponse(response, 'Error retrieving leaderboard data from Mhann service.', 'leaderboard')
    }

    async deployOperations(allyCode, userDiscordId, placements) {
        let body = convertQuigToMhannDeployment(allyCode, userDiscordId, placements)
        let response = await this._fetch('/api/tbdeploy', body)
        return await validateMhannResponse(response, 'Error deploying operations to Mhann service.')
    }

    async deployCommands(allyCode, userDiscordId, commands) {
        let body = convertQuigToMhannCommands(allyCode, userDiscordId, commands)
        // return body
        // TODO: comment out these lines to turn on the in-game call
        let response = await this._fetch('/api/tbzonemanagement', body)
        return await validateMhannResponse(response, 'Error deploying commands to Mhann service.')
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
