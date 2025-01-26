import { connectToDatabase } from "../utils/mongodb.js"
import Comlink from './comlink.js'
import { MyError, handleDBError } from "../utils/error.js"
import Registry from "./registry.js"
import Mhann from "./mhann.js"
import Refresh from "./database/refresh.js"
import { defaultGuildProjection, defaultPlayerProjection, defaultPlayerArenaProjection } from "../utils/projections.js"
import Data from "./database/data.js"
import Session from './database/session.js'
import { populateRoster } from "../utils/units.js"

class DB {

    //Player functions
    async getPlayer(payload, refresh, projection = defaultPlayerProjection) {
        const { db } = await connectToDatabase()
        if (refresh) {
            return await Refresh.refreshPlayer(payload, projection)
        }
        let response = await db.collection('player').findOne(payload, {projection: projection})
        if (!response) {
            console.log('player not found, refreshing')
            return await Refresh.refreshPlayer(payload, projection)
        }
        delete response.playerId
        return response
    }

    async getPlayers(array, projection = defaultPlayerProjection, key='allyCode', refresh = false, ignoreMissing = false) {
        const { db } = await connectToDatabase()
        projection[key] = 1
        try {
            if(refresh) {
                return await Refresh.refreshPlayers(array, projection, key)
            }
            let filter = {[key]: {$in: array}}
            let response = await db.collection('player').find(filter, {projection}).toArray()

            let found = response.map(account => account[key])
            let remaining = array.filter(id => !found.includes(id))
            if(ignoreMissing || remaining.length === 0) {
                return response
            }else {
                console.log(`missing accounts: ${remaining.length} [${remaining.join(',')}]`)
                let refreshedPlayers = await Refresh.refreshPlayers(remaining, projection, key)
                return [...response, ...refreshedPlayers]
            }
        } catch(err) {
            throw handleDBError(err, 'Player', 'get')
        }
    }

    async getPlayerArenas(array, projection = defaultPlayerArenaProjection, key = 'allyCode') {
        const { db } = await connectToDatabase()
        projection[key] = 1
        try {
            let filter = { [key]: { $in: array } }
            let response = await db.collection('playerArena').find(filter, { projection: projection }).toArray()

            let found = response.map(account => account[key])

            let remaining = array.filter(id => !found.includes(id))
            if (remaining.length === 0) {
                return response
            } else {
                console.log(`missing accounts: ${remaining.length} [${remaining.join(',')}]`)
                let refreshedArenas = await Promise.allSettled(remaining.map(async id => {
                    let payload = { [key]: id }
                    return await Refresh.refreshPlayerArena(payload, projection)
                }))
                return [...response, ...refreshedArenas]
            }
        } catch (err) {
            throw handleDBError(err, 'Player', 'get')
        }
    }

    async getAllyCodeFromPlayerId(playerId) {
        let allyCodeArray = await this.getPlayerArenas([playerId], {allyCode: 1}, 'playerId')
        if(allyCodeArray.length > 0) {
            return allyCodeArray[0].allyCode
        } else {
            throw new MyError(400, 'Unable to find allycode for this playerId')
        }
    }

    async getPlayerIdFromAllyCode(allyCode) {
        let playerIdArray = await this.getPlayerArenas([allyCode], {playerId: 1}, 'allyCode')
        if(playerIdArray.length > 0) {
            return playerIdArray[0].playerId
        } else {
            throw new MyError(400, 'Unable to find playerId for this allyCode')
        }
    }
    
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

    //Guild functions
    async getGuild(guildId, refresh=false, detailed=false, projection=defaultPlayerProjection) {
        if(detailed && Object.keys(projection).length === 0) { // trying to get all data for all guild members
            throw new MyError(403, "You absolutely will brick this system if you try this. Include a projection if you would like detailed guild member information.")
        }
        const { db } = await connectToDatabase()

        let guildData
        if(refresh) {
            guildData = await Refresh.refreshGuild(guildId)
        } else {
            guildData = await db.collection('guild').findOne({'profile.id': guildId}, {projection: defaultGuildProjection})
        }

        // return guildData
        if(!guildData) {
            console.log('guild not found, refreshing data')
            guildData = await Refresh.refreshGuild(guildId)
        }
        
        if(detailed) {
            let playerIdArray = guildData.member.map(player => player.playerId)
            let playerData = await this.getPlayers(playerIdArray, projection, 'playerId', refresh)
            let unitsMap = await Data.getUnitsMap()
            guildData.roster = []
            guildData.rosterMap = {}
            guildData.datacronMap = {}
            
            playerData.forEach(player => {
                //TODO: if this is for operations, make this a function within operations
                if(projection.rosterUnit !== undefined) {
                    populateRoster(unitsMap, player)
                    player.rosterMap = player.rosterUnit.reduce((map, obj) => (map[obj.defId] = obj, map), {})
                    guildData.roster.push(player)
                    guildData.rosterMap[player.allyCode] = player
                }

                if(projection.datacron) {
                    guildData.datacronMap[player.allyCode] = player.datacron
                }
            })
        }
        return guildData
    }

    async getGuildMemberDiscordRegistrations(guildId) {
        let guild = await this.getGuild(guildId)
        let guildAllyCodes = guild.member.map(member => member.allyCode)

        let discordRegistrations
        try {
            discordRegistrations = await Registry.getGuildDiscordRegistrations(guildAllyCodes)
        } catch(err) {
            throw handleDBError(err, 'Guild Member Registrations', 'get')
        }
        return discordRegistrations
    }

    // guild datacron test functions

    async getGuildDatacronTest(guildId) {
        const { db } = await connectToDatabase()

        let response
        try {
            response = await db.collection('guildDatacronTest').findOne({guildId: guildId})
        } catch(err) {
            throw handleDBError(err, 'Guild Datacron Test', 'get')
        }
        if(response) {
            return response
        } else {
            throw new MyError(404, 'No datacron tests associated with this guild.')
        }
    }

    async updateGuildDatacronTest(body) {
        const { db } = await connectToDatabase()

        let response
        try {
            response = await db.collection('guildDatacronTest').updateOne({guildId: body.guildId}, {$set: body}, {upsert: true})
        } catch(err) {
            throw handleDBError(err, "Guild Datacron Test", "set")
        }
        
        return response
    }

    //Discord functions
    async getAccountsByDiscordId(discordId) {
        let accounts = await Registry.getUserDiscordRegistrations(discordId)
        let allyCodes = accounts.map(account => account.allyCode)
        let accountsData
        try {
            accountsData = await this.getPlayers(allyCodes, {_id: 0, allyCode: 1, name: 1, guildId: 1})
        } catch(err) {
            throw handleDBError(err, 'Player', 'get')
        }
        let accountsMap = accountsData.reduce((map, obj) => (map[obj.allyCode] = obj, map), {})
        accounts.forEach(account => {
            let accountData = accountsMap[account.allyCode]
            account.name = accountData.name
            account.guildId = accountData.guildId
        })
        return accounts.sort((a,b) => a.primary ? -1 : b.primary ? 1 : 0)
    }

    async getGuildsByDiscordId(discordId) {

        let accounts = await Registry.getUserDiscordRegistrations(discordId)

        let allyCodes = accounts.map(account => account.allyCode)
        let guildData
        try {
            guildData = await this.getPlayers(allyCodes, {_id: 0, allyCode: 1, guildName: 1, guildId: 1})
        } catch(err) {
            throw handleDBError(err, 'Guild', 'get')
        }
        return guildData
    }

    // ROLES

    async getRoles(filter) {
        const { db } = await connectToDatabase()

        let roles
        try {
            roles = await db.collection('discord_role').find(filter).toArray()
        } catch(err) {
            throw handleDBError(err, 'Guild Roles', 'get')
        }
        return roles
    }

    async addRole(role) {
        const { db } = await connectToDatabase()

        try {
            await db.collection('discord_role').insertOne(role)
        } catch (err) {
            throw handleDBError(err, 'Guild Role', 'add')
        }
        return `Role [${JSON.stringify(role)}] added to the database`
    }

    async removeRole(role) {
        const { db } = await connectToDatabase()

        try {
            await db.collection('discord_role').deleteOne(role)
        } catch(err) {
            throw handleDBError(err, 'Guild Role', 'remove')
        }
        return `Role [${JSON.stringify(role)}] was removed from the database`
    }

    async getDefaultAccount(discordId) {
        const { db } = await connectToDatabase()
        let account
        try {
            let discordRegistrations = await Registry.getUserDiscordRegistrations(discordId)
            let defaultRegistration = discordRegistrations.length === 1 ? discordRegistrations : discordRegistrations.filter(reg => reg.primary)
            if(defaultRegistration.length === 0) {
                throw new MyError(400, "No default account associated with this user. Reregister an account and specify it as primary.")
            }
            account = await db.collection('player').findOne({allyCode: defaultRegistration[0].allyCode})
        } catch(err) {
            throw handleDBError(err, 'Default Account', 'get')
        }
        return account
    }

    async getDefaultGuild(discordId) {
        const { db } = await connectToDatabase()

        let { allyCode } = await this.getDefaultAccount(discordId)
        
        let guildData
        try {
            guildData = await db.collection('player').findOne({allyCode: allyCode}, {projection: {_id: 0, guildName: 1, guildId: 1}})
        } catch(err) {
            throw handleDBError(err, 'Default Guild', 'get')
        }
        return guildData
    }

    async registerUser(payload) {
        let {discordId, allyCode} = payload
        return Registry.registerDiscordUser(discordId, allyCode)
    }

    async verifyUser(payload) {
        let {discordId, allyCode, isPrimary} = payload
        return Registry.verifyDiscordUser(discordId, allyCode, isPrimary)
    }

    async getServerRegistrations(filter) {
        const { db } = await connectToDatabase()
        let serverRegistrations
        try {
            serverRegistrations = await db.collection('serverRegistration').find(filter).toArray()
        } catch(err) {
            throw handleDBError(err, 'Server Registration', 'get')
        }
        return serverRegistrations
    }

    async registerServer(payload) {
        const { db } = await connectToDatabase()
        try {
            let serverListing = await db.collection('serverListing').findOne({build: payload.build})
            let isPublic = serverListing.public
            if(isPublic || serverListing.list.includes(payload.serverId)) {
                await db.collection('serverRegistration').insertOne(payload)
            } else {
                throw new MyError(401, `You cannot register for this type of server [build=${payload.build}]`)
            }
        } catch(err) {
            throw handleDBError(err, 'Server Registration', 'set')
        }
        return `Server [serverId=${payload.serverId}] registered [build=${payload.build}]]`
    }

    async unregisterServer(serverId, build) {
        const { db } = await connectToDatabase()
        try {
            console.log(serverId, build)
            let response = await db.collection('serverRegistration').deleteOne({serverId: serverId, build: build})
            if(response.deletedCount === 0) {
                throw new MyError(400, `No documents were deleted from the database for [serverId=${serverId},build=${build}]`)
            }
        } catch(err) {
            throw handleDBError(err, 'Server Registration', 'delete')
        }
        return `Server [serverId=${serverId}] unregistered [build=${build}]]`
    }

    async getActiveBuilds(payload) {
        const { db } = await connectToDatabase()
        let response
        try {
            response = await db.collection('serverRegistration').find(payload).toArray()
        } catch(err) {
            throw handleDBError(err, 'Server Registration', 'get')
        }
        return response
    }

    async isGuildBuild(guildId) {
        let payload = {
            guildId: guildId
        }

        let builds = await this.getActiveBuilds(payload)
        return builds.some(build => build.build === "guild")
    }

    //datacron name functions

    async getDatacronNames(allyCode) {
        const { db } = await connectToDatabase()

        let response
        try {
            response = await db.collection('datacronNames').findOne({allyCode: allyCode}, {projection: {_id: 0}})
        } catch(err) {
            throw handleDBError(err, 'datacronNames', 'get')
        }
        return response
    }

    async updateDatacronNames(body) {
        const { db } = await connectToDatabase()

        try {
            await db.collection('datacronNames').updateOne({allyCode: body.allyCode}, {$set: body}, {upsert: true})
        } catch(err) {
            throw handleDBError(err, 'datacronNames', 'set')
        }
        return 'Datacron Names updated'
    }

    async getGameConnection(session, allyCode) {
        const { db } = await connectToDatabase()
        let discordId = (await Session.sessionToDiscord(session)).id
        let response
        try {
            response = await db.collection('gameConnection').findOne({allyCode: allyCode, discordId: discordId})
        } catch(err) {
            handleDBError(err, 'gameConnection', 'get')
        }
        return response
    }

    async getAuthStatus(session, allyCode) {
        let count = (await this.getGameConnection(session, allyCode)).length
        if(count > 0) {
            return 'Success - Eligible for 3rd party authentication.'
        }

        return Mhann.getUserAuthStatus(allyCode)
    }
}

export default new DB()