import { connectToDatabase } from "../../utils/mongodb.js"
import Comlink from '../comlink.js'
import { handleDBError } from "../../utils/error.js"
import Data from "./data.js"

class DB {
    async getDiscordRegistrationsFromCache(discordId) {
        const { db } = await connectToDatabase()
        let response
        try {
            response = await db.collection('registryCache').findOne({discordId: discordId})
        } catch(err) {
            throw handleDBError(err, "registryCache", "get")
        }

        return response?.registry || []
    }

    async setDiscordRegistrationInCache(discordId, registry) {
        const { db } = await connectToDatabase()
        try {
            let body = {
                discordId: discordId,
                registry: registry,
                lastRefreshed: new Date()
            }
            await db.collection('registryCache').updateOne({discordId: discordId}, { $set: body}, {upsert: true})
        } catch(err) {
            throw handleDBError(err, "registryCache", "set")
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