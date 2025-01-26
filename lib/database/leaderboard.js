import { connectToDatabase } from '../../utils/mongodb.js'
import { handleDBError } from '../../utils/error'

class Leaderboard {
    async getLeaderboards(projection) {
        const { db } = await connectToDatabase()
        let response
        try {
            response = await db.collection('serverRegistration').find({build: "gac"}, {projection: projection}).toArray()
        } catch(err) {
            throw handleDBError(err, "GAC Leaderboard", "get")
        }
        return response
    }


    async getLeaderboard(serverId) {
        const { db } = await connectToDatabase()
        let response
        try {
            response = await db.collection('serverRegistration').findOne({build: "gac", serverId: serverId})
        } catch(err) {
            throw handleDBError(err, "GAC Leaderboard", "get")
        }
        return response
    }

    async setLeaderboardChannel(serverId, channelId, messageId) {
        const { db } = await connectToDatabase()
        try {
             await db.collection('serverRegistration').updateOne({build: "gac", serverId: serverId}, {$set: {channelId: channelId, messageId: messageId}})
        } catch(err) {
            throw handleDBError(err, "GAC Leaderboard", "set")
        }
        return `GAC Leaderboard set`
    }

    async unsetLeaderboardChannel(serverId) {
        const { db } = await connectToDatabase()
        let response
        try {
            response = await db.collection('serverRegistration').findOne({build: 'gac', serverId: serverId})
            await db.collection('serverRegistration').updateOne({build: 'gac', serverId: serverId}, {$unset: {channelId: "", messageId: ""}})
        } catch(err) {
            throw handleDBError(err, 'GAC leaderboard', 'unset')
        }
        return response
    }

    async addAccountToLeaderboard(allyCode, serverId) {
        const { db } = await connectToDatabase()
        try {
            await db.collection('serverRegistration').updateOne({build: "gac", serverId: serverId}, {$addToSet: {accounts: allyCode}})
        } catch(err) {
            throw handleDBError(err, "GAC Leaderboard", "add allyCode")
        }
        return `AllyCode [allyCode=${allyCode}] added to leaderboard.`
    }

    async removeAccountFromLeaderboard(allyCode, serverId) {
        const { db } = await connectToDatabase()
        try {
            await db.collection('serverRegistration').updateOne({build: "gac", serverId: serverId}, {$pull: {accounts: allyCode}})
        } catch(err) {
            throw handleDBError(err, "GAC Leaderboard", "remove allyCode")
        }
        return `AllyCode [allyCode=${allyCode}] removed from leaderboard.`
    }
}

export default new Leaderboard()