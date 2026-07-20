import { handleDBError, MyError } from '../../../utils/error.js';
import Registry from '../../registry.js';
import Player from '../player/player.js';
import { connectToDatabase } from '../../../utils/mongodb.js'


class DiscordUser {
    async getAccountsByDiscordId(discordId, ignoreCache = false) {
        let accounts = await Registry.getUserDiscordRegistrations(discordId, ignoreCache)
        let allyCodes = accounts.map(account => account.allyCode)
        let accountsData
        try {
            accountsData = await Player.getPlayers(allyCodes, {_id: 0, allyCode: 1, name: 1, guildId: 1, guildName: 1})
        } catch(err) {
            throw handleDBError(err, 'Player', 'get')
        }
        let accountsMap = accountsData.reduce((map, obj) => (map[obj.allyCode] = obj, map), {})
        return accounts
        .map(account => {
            let accountData = accountsMap[account.allyCode]
            return {...account, ...accountData}
        })
        .sort((a,b) => a.primary ? -1 : b.primary ? 1 : (a.verified ? -1 : b.verified ? 1 : 0))
    }
    
    async getDefaultAccount(discordId) {
        let accounts = await this.getAccountsByDiscordId(discordId)

        if(accounts.length === 0) {
            return undefined
        }
        if(accounts.length === 1) {
            return accounts[0].guildId
        }
        let primary = accounts.find(account => account.primary)
        return primary || undefined
    }

    async getDefaultAllyCode(discordId) {
        let account = await this.getDefaultAccount(discordId)
        return account?.allyCode || undefined
    }

    async getDefaultGuildId(discordId) {
        let account = await this.getDefaultAccount(discordId)
        return account?.guildId || undefined
    }

    async getSettings(discordId) {
        const { db } = await connectToDatabase()

        let response
        try {
            response = await db.collection('settings').findOne({type: 'user', id: discordId}, {projection: {_id: 0, type: 0, id: 0}})
        } catch(err) {
            throw handleDBError(err, 'Discord user settings', 'get')
        }
        return response
    }

    async updateSettings(discordId, settings) {
        const { db } = await connectToDatabase()

        const replacement = {
            type: 'user',
            id: discordId,
            ...(settings && typeof settings === 'object' ? settings : {})
        }

        let response
        try {
            response = await db.collection('settings').replaceOne(
                {type: 'user', id: discordId},
                replacement,
                {upsert: true}
            )
        } catch(err) {
            throw handleDBError(err, 'Discord user settings', 'post')
        }
        if(!response.acknowledged) {
            throw new MyError(500, `Failed to update settings for user [id=${discordId}]`)
        }
        return response
    }
}

export default new DiscordUser()