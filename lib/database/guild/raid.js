import { handleDBError, MyError } from "../../../utils/error.js"
import { connectToDatabase } from "../../../utils/mongodb.js"
import Mhann from "../../mhann.js"

class Raid {

    async getActiveRaid(allyCode, guildId, discordId, refresh = false) {
        // Implementation for fetching active raid data
        let response = await this._getActiveRaid(guildId)
        if(response === null && !refresh) {
            throw new MyError(404, 'No active raid present in database.')
        }
        if(response === null || refresh) {
            let mhannResponse = await Mhann.getActiveRaid(allyCode, discordId)
            response = this._putActiveRaid(guildId, mhannResponse)
        }
        return response
    }

    async _getActiveRaid(guildId) {
        const { db } = await connectToDatabase()
        try {
            return await db.collection('activeRaid').findOne({guildId})
        } catch(err) {
            throw handleDBError(err, 'activeRaid', 'get')
        }
    }

    async _putActiveRaid(guildId, obj) {
        const { db } = await connectToDatabase()
        let body = {guildId, lastRefreshed: new Date(), ...obj}
        try {
            let response = await db.collection('activeRaid').findOneAndUpdate({guildId}, {$set: body}, {upsert: true, returnDocument: 'after'})
            return response.value
        } catch(err) {
            throw handleDBError(err, 'activeRaid', 'put')
        }
    }

}

export default new Raid()