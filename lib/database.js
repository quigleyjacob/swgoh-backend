import { connectToDatabase } from "../utils/mongodb.js"
import Comlink from './comlink.js'
import { MyError, handleDBError } from "../utils/error.js"
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