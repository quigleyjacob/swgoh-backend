import { connectToDatabase } from "../../utils/mongodb.js"
import Comlink from '../comlink.js'
import { handleDBError, MyError } from "../../utils/error.js"
import Data from "./data.js"
import { redisGet, redisPut } from "../redis.js"

class DB {

    getRegistryCacheKey = (discordId) => `registry-cache:${discordId}`

    async getDiscordRegistrationsFromCache(discordId) {
        // const { db } = await connectToDatabase()
        let response
        try {
            let key = this.getRegistryCacheKey(discordId)
            response = JSON.parse(await redisGet(key))
            // response = await db.collection('registryCache').findOne({discordId: discordId})
        } catch(err) {
            throw new MyError(400, 'Error getting discord registrations from cache', err)
            // throw handleDBError(err, "registryCache", "get")
        }

        return response?.registry || []
    }

    async setDiscordRegistrationInCache(discordId, registry) {
        // const { db } = await connectToDatabase()
        try {
            let body = {
                discordId: discordId,
                registry: registry,
                lastRefreshed: new Date()
            }
            let key = this.getRegistryCacheKey(discordId)
            await redisPut(key, {discordId, registry}, 60*60)
            // await db.collection('registryCache').updateOne({discordId: discordId}, { $set: body}, {upsert: true})
        } catch(err) {
            throw new MyError(400, 'Error putting discord registrations in cache', err)
            // throw handleDBError(err, "registryCache", "set")
        }
    }

    async newGameVersionAvailable() {
        let metaData = await Comlink.getMetaData()
        let savedMetaData = await Data.getData('metaData')

        return {
            newVersion: metaData.latestGamedataVersion !== savedMetaData.latestGamedataVersion,
            latestGamedataVersion: metaData.latestGamedataVersion,
            latestLocalizationBundleVersion: metaData.latestLocalizationBundleVersion
        }
    }
}

export default new DB()