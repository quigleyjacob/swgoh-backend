import { connectToDatabase } from "../utils/mongodb.js"
import Comlink from './comlink.js'
import { MyError, handleDBError } from "../utils/error.js"
import { ObjectId } from "mongodb"
import Registry from "./registry.js"
import Mhann from "./mhann.js"
import Refresh from "./database/refresh.js"
import fetch from 'node-fetch'
import { validateResponse } from "./validation.js"
import { defaultGuildProjection, defaultPlayerProjection, defaultPlayerArenaProjection } from "../utils/projections.js"
import Data from "./database/data.js"
import { getBoardStatusForPlayer } from "../utils/gac.js"
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

    // GAC Leaderboard functions
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

    async refreshAccountsInLeaderboard(serverId) {
        let leaderboard = await this.getLeaderboard(serverId)

        let allyCodes = leaderboard.accounts
        await Refresh.refreshPlayerArenas(allyCodes)

        return `Accounts for leaderboard [serverId=${serverId}] refreshed.`
    }

    // Mhann endpoints
    // TODO: consolidate into one function, use refresh flag
    async getInventory(allyCode) {
        const { db } = await connectToDatabase()

        let response
        try {
            response = await db.collection('inventory').findOne({allyCode: allyCode})
        } catch (err) {
            throw handleDBError(err, "Inventory", 'get')
        }
        if(response === null) {
            throw new MyError(404, "Inventory not found in the database, please refresh to populate data.")
        }
        return response
    }

    async refreshInventory(allyCode) {
        const { db } = await connectToDatabase()

        let inventory = await Mhann.getUserInventory(allyCode)

        inventory.allyCode = allyCode
        inventory.lastRefreshed = new Date()

        try {
            db.collection('inventory').updateOne({allyCode: allyCode}, {$set: inventory}, {upsert: true})
        } catch(err) {
            throw handleDBError(err, 'inventory', 'set')
        }

        return inventory

    }

    //Misc functions

    async getPlatoons(tb, zones = [], excludedPlatoons = []) {
        const { db } = await connectToDatabase()

        const getBody = (zoneId) => {
            let arr = zoneId.split(':')
            let map = {}
            if(arr.length > 0) {
                map.alignment = arr[0]
            }
            if(arr.length > 1) {
                map.phase = Number(arr[1])
            }
            if(arr.length > 2) {
                map.operation = Number(arr[2])
            }
            if(arr.length > 3) {
                map.row = Number(arr[3])
            }
            if(arr.length > 4) {
                map.slot = Number(arr[4])
            }
            return map
        }

        let zonesQueryList = zones.map(zone => getBody(zone))

        let excludedPlatoonsQueryList = excludedPlatoons.map(platoon => getBody(platoon))

        let query = zones.length === 0
        ?
        {tb: tb}
        :
        excludedPlatoons.length === 0
        ?
        {tb: tb, $or:zonesQueryList}
        :
        {tb: tb, $or:zonesQueryList, $nor: excludedPlatoonsQueryList}

        let platoonData = await db.collection('platoons').find(query).toArray()
        return platoonData
    }

    // Session functions

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
        let guilds = await this.getGuildsByDiscordId(user.id)
        return guilds.map(guild => guild.guildId).includes(guildId)
    }

    async sessionIsGuildOfficer(sessionId, guildId) {
        if(process.env.DEV) {
            return true
        }
        let user = await this.sessionToDiscord(sessionId)
        let account = (await this.getAccountsByDiscordId(user.id)).filter(account => account.guildId === guildId)
        let guild = await this.getGuild(guildId)
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
        let account = (await this.getAccountsByDiscordId(user.id)).filter(account => account.allyCode === allyCode)
        return account && account.length > 0
    }

    // Command functions

    async getCommands(guildId, type, projection) {
        const { db } = await connectToDatabase()
        let response
        try {
            response = await db.collection('command').find({guildId: guildId, type: type}, {projection: projection}).toArray()
        } catch(err) {
            throw handleDBError(err, 'command', 'get')
        }
        return response
    }

    async getCommand(commandId, projection) {
        const { db } = await connectToDatabase()
        let response
        try {
            response = await db.collection('command').findOne({_id: new ObjectId(commandId)}, {projection: projection})
        } catch(err) {
            throw handleDBError(err, 'command', 'get')
        }
        return response
    }

    async addCommand(commandId, type, title, description, guildId) {
        const { db } = await connectToDatabase()
        let command = {
            type: type,
            title: title,
            description: description, 
            guildId: guildId
        }
        let response
        try {
            if(commandId) {
                response = await db.collection('command').updateOne({_id: new ObjectId(commandId)}, {$set: command})
            } else {
                response = await db.collection('command').insertOne(command)
            }
            
        } catch(err) {
            throw handleDBError(err, 'command', 'set')
        }
        let id = response.insertedId || commandId
        return await db.collection('command').findOne({_id: new ObjectId(id)})
    }

    async deleteCommand(commandId) {
        const { db } = await connectToDatabase()
        let response
        try {
            response = await db.collection('command').deleteOne({_id: new ObjectId(commandId)})
        } catch(err) {
            throw handleDBError(err, "command", 'delete')
        }
        return `Command [id=${commandId}] successfully deleted.`
    }

    // Operation functions

    async getOperations(guildId, projection) {
        const { db } = await connectToDatabase()
        let response
        try {
            response = await db.collection('operation').find({guildId: guildId}, {projection: projection}).toArray()
        } catch(err) {
            throw handleDBError(err, 'operation', 'get')
        }
        return response
    }

    async getOperation(operationId, projection) {
        const { db } = await connectToDatabase()
        let response
        try {
            response = await db.collection('operation').findOne({_id: new ObjectId(operationId)}, {projection: projection})
        } catch(err) {
            throw new handleDBError(err, 'operation', 'get')
        }
        return response
    }

    async addOperation(operation, operationId, guildId) {
        const { db } = await connectToDatabase()
        operation.guildId = guildId
        let response
        try {
            if(operationId) {
                response = await db.collection('operation').updateOne({_id: new ObjectId(operationId)}, {$set: operation})
            } else {
                response = await db.collection('operation').insertOne(operation)
            }
        } catch(err) {
            throw handleDBError(err, 'operation', 'set')
        }
        let id = response.insertedId || operationId
        return await db.collection('operation').findOne({_id: new ObjectId(id)})
    }

    async deleteOperation(operationId) {
        const { db } = await connectToDatabase()
        let response
        try {
            response = await db.collection('operation').deleteOne({_id: new ObjectId(operationId)})
            if(response.deletedCount === 0) {
                throw new MyError(400, `No operations were deleted from the database for [operationId=${operationId}]`)
            }
        } catch(err) {
            throw handleDBError(err, "operation", 'delete')
        }
        return `Operation [id=${operationId}] successfully deleted.`
    }

    // Data (infographics)
    async addGAC(gac) {
        const { db } = await connectToDatabase()
        let id = gac._id
        delete gac._id
        let response
        try {
            if(id) {
                response = await db.collection('gac').updateOne({_id: new ObjectId(id)}, {$set: gac})
            } else {
                response = await db.collection('gac').insertOne(gac)
            }
        } catch(err) {
            throw handleDBError(err, 'gac', 'set')
        }
        let gacId = String(response.insertedId || id)
        return gacId
    }

    async getAllGAC(allyCode) {
        const { db } = await connectToDatabase()
        let response
        try {
            response = await db.collection('gac').find({'player.allyCode': allyCode}).sort({time: -1}).limit(10).toArray()
        } catch(err) {
            handleDBError(err, 'gac', 'get')
        }
        return response
    }

    async getLatestBracketResults(allyCode) {

        const { db } = await connectToDatabase()

        // need to 
        let response = await db.collection('player').findOne({allyCode: allyCode}, {projection: {playerId: 1}})
        let playerId = response.playerId

        return this.getLatestBracketResultsFromPlayerId(playerId)

    }

    async getLatestBracketResultsFromPlayerId(playerId) {
        // const __filename = fileURLToPath(import.meta.url);
        // const __dirname = path.dirname(__filename);
        // return JSON.parse(fs.readFileSync(path.resolve(__dirname, './bracket.json')))
        let json = await fetch(`https://gahistory.c3po.wtf/player/${playerId}.json`, {method: 'GET'})
        return validateResponse(json, 'Unable to get latest GAC Bracket results')
    }

    async getGameConnection(session, allyCode) {
        const { db } = await connectToDatabase()
        let discordId = (await this.sessionToDiscord(session)).id
        let response
        try {
            response = await db.collection('gameConnection').find({allyCode: allyCode, discordId: discordId}).toArray()
        } catch(err) {
            handleDBError(err, 'gameConnection', 'get')
        }
        return response
    }

    async getGameConnectionCount(session, allyCode) {
        return {count: (await this.getGameConnection(session, allyCode)).length}
    }

    async getCurrentGACBoard(allyCode) {
        // let gameConnectionArray = await this.getGameConnection(session, allyCode)
        // if(gameConnectionArray.length === 0) {
        //     throw new MyError(400, 'No game connection associated with this user')
        // }
        // let gameConnection = gameConnectionArray[0]
        // let gacBoard
        try {
            let gacBoard = await Mhann.getCurrentGACBoard(allyCode)
            if(!gacBoard.activeMatch) {
                throw new MyError(400, 'There is no current GAC data.')
            }
            let opponentAllyCode = await this.getAllyCodeFromPlayerId(gacBoard.activeMatch.opponent.id)
            // return opponentAllyCode
            let mode = gacBoard.activeMatch.tournamentMapId.includes('5v5') ? 5 : 3
            // return {mode}
            let league = gacBoard.activeMatch.opponent.leagueId
            // return league
            let zones = gacBoard.activeMatch.homeStatus.conflictStatus.map(zone => zone.zoneStatus.zoneId)
            // return zones
            let homeStatus = getBoardStatusForPlayer(gacBoard.activeMatch.homeStatus)
            // return homeStatus
            let awayStatus = getBoardStatusForPlayer(gacBoard.activeMatch.awayStatus)
            return {
                mode,
                league,
                opponent: {
                    allyCode: opponentAllyCode
                },
                zones,
                homeStatus,
                awayStatus
            }
        } catch(err) {
            throw err
        }

        // return gacBoard
    }

    async addSquad(squadData) {
        const { db } = await connectToDatabase()
        let response
        try {
            response = await db.collection('squad').insertOne(squadData)
        } catch(err) {
            throw handleDBError(err, 'squad', 'set')
        }
        let squadId = response.insertedId
        return await db.collection('squad').findOne({_id: new ObjectId(squadId)})
    }

    async getSquads(allyCode) {
        const { db } = await connectToDatabase()
        let response
        try {
            response = await db.collection('squad').find({allyCode: allyCode}).toArray()
        } catch(err) {
            throw handleDBError(err, 'squad', 'get')
        }
        return response
    }

    async deleteSquad(squadId) {
        const { db } = await connectToDatabase()
        try {
            await db.collection('squad').deleteOne({_id: new ObjectId(squadId)})
        } catch(err) {
            throw handleDBError(err, 'squad', 'delete')
        }
        return `Squad [squadId=${squadId}] has been deleted.`
    }

    // defenses functions

    async getDefense(allyCode, defenseId) {
        const { db } = await connectToDatabase()
        try {
            let response = await db.collection('defense').findOne({allyCode: allyCode, _id: new ObjectId(defenseId)})
            return response
        } catch(err) {
            throw handleDBError(err, 'defense', 'get')
        }
    }

    async addDefense(allyCode, defenseData) {
        const { db } = await connectToDatabase()
        defenseData.allyCode = allyCode
        try {
            let response = await db.collection('defense').insertOne(defenseData)
            let id = response.insertedId
            return {_id: id, ...defenseData}
        } catch(err) {
            throw handleDBError(err, 'defense', 'set')
        }
    }

    async updateDefense(allyCode, defenseId, defenseData) {
        const { db } = await connectToDatabase()
        delete defenseData._id
        defenseData.allyCode = allyCode
        try {
            let response = await db.collection('defense').findOneAndUpdate({allyCode: allyCode, _id: new ObjectId(defenseId)},{$set: defenseData}, {returnDocument: 'after'})
            return response.value
        } catch(err) {
            throw handleDBError(err, 'defense', 'set')
        }
    }

    async getDefenses(allyCode) {
        const { db } = await connectToDatabase()
        try {
            let response = await db.collection('defense').find({allyCode: allyCode}).toArray()
            return response
        } catch(err) {
            throw handleDBError(err, 'defense', 'set')
        }
    }

    async deleteDefense(allyCode, defenseId) {
        const { db } = await connectToDatabase()
        let response
        try {
            response = await db.collection('defense').deleteOne({allyCode: allyCode, _id: new ObjectId(defenseId)})
        } catch(err) {
            throw handleDBError(err, 'defense', 'delete')
        }
        if(response.deletedCount > 0) {
            return `Defense [defenseId=${defenseId}] has been deleted.`
        } else {
            throw new MyError(404, "No Defense found with this id that belongs to you.")
        }
    }
}

export default new DB()