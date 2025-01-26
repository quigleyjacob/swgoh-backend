import { connectToDatabase } from "../utils/mongodb.js"
import Comlink from './comlink.js'
import { MyError, handleDBError } from "../utils/error.js"
import Refresh from "./database/refresh.js"
import { defaultGuildProjection, defaultPlayerProjection } from "../utils/projections.js"
import Data from "./database/data.js"
import { populateRoster } from "../utils/units.js"

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
}

export default new DB()