import { config } from 'dotenv'
import RateLimiter, {RequestRequestHandler} from 'request-rate-limiter'
import { MyError } from '../utils/error.js'
import DB from './database/database.js'
import { getMhannHeaders } from '../utils/mhann.js'

config()

class Registry {

    constructor() {
        this.url = process.env.REGISTRY_URL
        this.apiKey = process.env.REGISTRY_API_KEY
        this.limiter = new RateLimiter({
            backoffTime: 0.1,
            requestRate: 1000,
            interval: 0.1,
            timeout: 30
        })
        this.limiter.setRequestHandler(new RequestRequestHandler({
            backoffHTTPCode: 503
        }))
    }

    async getUserDiscordRegistrations(discordId) {
        let cachedRegistry = await DB.getDiscordRegistrationsFromCache(discordId)
        if(cachedRegistry.length === 0) {
            let registry = await this.getDiscordRegistrations([discordId])
            await DB.setDiscordRegistrationInCache(discordId, registry)
            return registry
        }
        return cachedRegistry
    }

    async getGuildDiscordRegistrations(allyCodes) {
        return this.getDiscordRegistrations(allyCodes)
    }

    // get all discord registrations associated with the given discord user
    async getDiscordRegistrations(array) {
        let body = {
            user: array,
            endpoint: 'find'
        }
        let headers = getMhannHeaders('POST', body, '/api/database', this.apiKey)
        let response = await this.limiter.request({
            url: `${this.url}/api/database`,
            method: "POST",
            headers,
            body: JSON.stringify(body)
        })
        if(response.statusCode === 200) {
            return JSON.parse(response.body)
        } else {
            throw new MyError(response.statusCode, "Issue getting discord registrations")
        }
    }

    async registerDiscordUser(discordId, allyCode) {
        let body = {
            discordId: discordId,
            method: 'registration',
            payload: {allyCode: allyCode},
            enums: false
        }
        let response = await this.limiter.request({
            url: `${this.url}/api/comlink`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'api-key': this.apiKey},
            body: JSON.stringify(body)
        })
        if(response.statusCode === 200) {
            let registry = await this.getDiscordRegistrations([discordId])
            await DB.setDiscordRegistrationInCache(discordId, registry)
            return JSON.parse(response.body)
        } else {
            throw new MyError(response.statusCode, "Issue registering discord user.")
        }
    }

    async verifyDiscordUser(discordId, allyCode, isPrimary) {
        const body = {
            discordId: discordId,
            method: 'verification',
            primary: isPrimary,
            payload: {allyCode: allyCode},
            enums: false
        }
        let response = await this.limiter.request({
            url: `${this.url}/api/comlink`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'api-key': this.apiKey},
            body: JSON.stringify(body)
        })
        if(response.statusCode === 200) {
            return JSON.parse(response.body)
        } else {
            throw new MyError(response.statusCode, "Issue verifying discord user.")
        }
    }


}

export default new Registry()