import { connectToDatabase } from '../../utils/mongodb.js'
import { handleDBError, MyError } from '../../utils/error.js'
import Guild from './guild/guild.js'
import DiscordUser from './discord/user.js'

class Session {

    async beginSession(sessionId) {
        const { db } = await connectToDatabase()
        try {
            let expiration = new Date()
            expiration.setDate(expiration.getDate() + 30)
            await db.collection('session').insertOne({sessionId, user: null, expiration})
        } catch(err) {
            throw handleDBError(err, "Session", 'set')
        }
    }

    async verifySessionIncomplete(sessionId) {
        const { db } = await connectToDatabase()
        try {
            let count = await db.collection('session').count({sessionId: sessionId, user: null})
            if(count == 0) {
                throw new MyError(401, "CSRF Detected")
            }
        } catch(err) {
            throw handleDBError(err, "Session", 'get')
        }
    }

    async verifySessionComplete(sessionId) {
        const { db } = await connectToDatabase()
        try {
            let count = await db.collection('session').count({sessionId: sessionId, user: {$ne: null}})
            if(count == 0) {
                throw new MyError(401, "Invalid session token")
            }
            return true
        } catch(err) {
            throw handleDBError(err, "Session", 'get')
        }
    }

    async getSessionExpiration(sessionId) {
        const { db } = await connectToDatabase()
        try {
            let response = await db.collection('session').findOne({sessionId: sessionId}, {projection: {expiration: 1}})
            return response?.expiration || new Date(0)
        } catch(err) {
            throw handleDBError(err, "Session Expiration", 'get')
        }
    }

    async authenticateSession(sessionId, discordUser, tokenObject) {
        const { db } = await connectToDatabase()
        let session
        try {
            session = await db.collection('session').findOneAndUpdate({sessionId: sessionId, discordId: null}, {$set: {user: discordUser, token: tokenObject, createTime: new Date()}})
        } catch(err) {
            throw handleDBError(err, 'Session', "patch")
        }
        return session.value
    }

    async sessionToDiscord(sessionId) {
        const { db } = await connectToDatabase()
        try {
            let response = await db.collection('session').findOne({sessionId: sessionId})
            if(response) {
                return response.user
            } else {
                throw new MyError(400, 'Cannot find the discordId for this session')
            }
        } catch(err) {
            throw handleDBError(err, 'Session', "get")
        }
    }

    async sessionInGuild(sessionId, guildId) {
        let user = await this.sessionToDiscord(sessionId)
        let guilds = await DiscordUser.getAccountsByDiscordId(user.id)
        return guilds.map(guild => guild.guildId).includes(guildId)
    }

    async sessionIsGuildOfficer(sessionId, guildId) {
        if(process.env.DEV) {
            return true
        }
        let user = await this.sessionToDiscord(sessionId)
        let account = (await DiscordUser.getAccountsByDiscordId(user.id)).filter(account => account.guildId === guildId)
        let guild = await Guild.getGuild(guildId)
        if(guild === null || account.length === 0) {
            return false
        }
        let member = guild.member.filter(member => member.allyCode === account[0].allyCode)
        if(member.length === 0) {
            return false
        }
        return member[0].memberLevel > 2
    }

    async sessionIsPlayer(sessionId, allyCode) {
        let user = await this.sessionToDiscord(sessionId)
        let account = (await DiscordUser.getAccountsByDiscordId(user.id)).filter(account => account.allyCode === allyCode)
        return account && account.length > 0
    }

}

export default new Session()