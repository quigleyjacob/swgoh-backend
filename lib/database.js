import { connectToDatabase } from "../utils/mongodb.js"
import Comlink from './comlink.js'
import decompress from 'decompress'
import { MyError } from "./error.js"
import { ObjectId } from "mongodb"
import Registry from "./registry.js"
import Mhann from "./mhann.js"
import { getCurrentGAC } from "./hu.js"
import { powerRankingMultiplier } from "../utils/constants.js"
import fetch from 'node-fetch'
import { validateResponse } from "./validation.js"
import { getTags, handleNightTrooperTemplate, handlePOWTemplate, handleGreatMothersTemplate, handleBaylanSkollTemplate } from "../utils/datacrons.js"
import { getModScore } from "../utils/mods.js"
import { defaultGuildProjection, defaultPlayerProjection } from "../utils/projections.js"
// import fs from 'fs'
// import path from 'path'
// import { fileURLToPath } from "url"

class DB {

    constructor() {
        this.S3_URL = ''
    }

    //Player functions
    async getPlayerData(payload, refresh, projection = defaultPlayerProjection) {
        const { db } = await connectToDatabase()
        if (refresh) {
            await this.refreshPlayer(payload)
        }
        let response = await db.collection('player').findOne(payload, {projection: projection})
        if (!response) {
            console.log('player not found, refreshing')
            return this.getPlayerData(payload, true, projection)
        }
        delete response.playerId
        return response
    }

    async getAccountsData(array, projection, key='allyCode', retry = 0, refresh = true) {
        const { db } = await connectToDatabase()
        projection = {...projection, [key]:1}
        let response
        try {
            let filter = key === 'allyCode' ? {allyCode: {$in: array}} : {playerId: {$in: array}}
            response = await db.collection('player').find(filter, {projection: projection}).toArray()

            let found = response.map(account => account[key])
            if(refresh) {
                let remaining = array.filter(id => !found.includes(id))
                if(remaining.length === 0) {
                    return response
                } else if(retry === 3) {
                    throw MyError(500, "Unable to get accounts data")
                } else {
                    console.log(`missing accounts: ${remaining.length} [${remaining.join(',')}]`)
                    await Promise.allSettled(remaining.map(async id => {
                        let payload = key === 'allyCode' ? {allyCode: id} : {playerId: id}
                        await this.refreshPlayer(payload)
                    }))
                    return [...response, ...(await this.getAccountsData(remaining, projection, key, retry+1))]
                }
            } else {
                return response
            }

        } catch(err) {
            throw handleDBError(err, 'Player', 'get')
        }
    }

    async getArenasData(array, projection, key='allyCode') {
        const { db } = await connectToDatabase()

        let response
        try {
            let filter = {[key]: {$in: array}}
            response = await db.collection('playerArena').find(filter, {projection: projection}).toArray()

            let found = response.map(account => account[key])

            let remaining = array.filter(id => !found.includes(id))
            if(remaining.length === 0) {
                return response
            } else {
                console.log(`missing accounts: ${remaining.length} [${remaining.join(',')}]`)
                await Promise.allSettled(remaining.map(async id => {
                    let payload = {[key]: id}
                    await this.refreshArena(payload)
                }))
                return [...response, ...(await this.getArenasData(remaining, projection, key))]
            }
        } catch(err) {
            throw handleDBError(err, 'Player', 'get')
        }
    }

    async refreshPlayer(payload) {
        try {
            const { db } = await connectToDatabase()
            let comlinkResponse = await Comlink.getPlayerWithStats(payload)
            let skill = await this.getSkills()
            let skillMap = skill.reduce((map, obj) => (map[obj.id] = obj, map), {})

            let allyCode = comlinkResponse.allyCode

            // determine the zeta and omi count for each toon for this player
            comlinkResponse.rosterUnit.forEach(unit => {
                unit.zetaCount = zetaCount(unit, skillMap)
                unit.omicronCount = omicronCount(unit, skillMap)
            })

            // adds baseId to each unit from the definitionId
            comlinkResponse.rosterUnit.forEach(unit => {
                let baseId = unit.definitionId.split(':')[0]
                unit.baseId = baseId
            })

            // updates latest refresh
            comlinkResponse.lastRefreshed = new Date()

            //computes total GP
            comlinkResponse.galacticPower = comlinkResponse.rosterUnit.reduce((a,b) => a + (b.gp || 0), 0)

            comlinkResponse.squadGalacticPower = comlinkResponse.rosterUnit.filter(unit => unit.relic).reduce((a,b) => a + (b.gp || 0), 0)

            //computes mod score
            comlinkResponse.modScore = getModScore(comlinkResponse)

            // removes mod data from each unit (very space heavy)
            comlinkResponse.rosterUnit = comlinkResponse.rosterUnit.map(({equippedStatMod, ...rest}) => rest)

            // compute GAC Power Score
            let leagueId = comlinkResponse?.playerRating?.playerRankStatus?.leagueId
            let divisionId = comlinkResponse?.playerRating?.playerRankStatus?.divisionId
            let skillRating = comlinkResponse?.playerRating?.playerSkillRating?.skillRating
            if(leagueId && divisionId && skillRating) {
                comlinkResponse.gacPowerScore = (powerRankingMultiplier[leagueId][divisionId]) * (skillRating) / (comlinkResponse.galacticPower / 1e5)
            } else {
                comlinkResponse.gacPowerScore = 0
            }

            await db.collection('player').updateOne({ allyCode: allyCode }, { $set: comlinkResponse }, { upsert: true })

            return `Player data [allyCode=${allyCode}] refreshed`
        } catch(err) {
            throw handleDBError(err, `Player ${JSON.stringify(payload)}`, 'update')
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

    async refreshMetaData() {
        const { db } = await connectToDatabase()
        let metaData = await Comlink.getMetaData()
        try {
            db.collection('data').updateOne({type: 'metaData'}, {$set: metaData}, {upsert: true})
        } catch(err) {
            throw handleDBError(err, 'metadata', 'set')
        }
    }

    async newGameVersionAvailable() {
        const { db } = await connectToDatabase()
        let metaData = await Comlink.getMetaData()
        let savedMetaData = await db.collection('data').findOne({type: 'metaData'})

        return {
            newVersion: metaData.latestGamedataVersion !== savedMetaData.latestGamedataVersion,
            latestGamedataVersion: metaData.latestGamedataVersion,
            latestLocalizationBundleVersion: metaData.latestLocalizationBundleVersion
        }
    }

    //Guild functions
    async getGuildData(guildId, refresh=false, detailed=false, projection={}) {
        if(detailed && Object.keys(projection).length === 0) { // trying to get all data for all guild members
            throw new MyError(403, "You absolutely will brick this system if you try this. Include a projection if you would like detailed guild member information.")
        }
        const { db } = await connectToDatabase()
        if(refresh) {
            await this.refreshGuild(guildId, detailed)
        }
        let guildData = await db.collection('guild').findOne({id: guildId}, {projection: defaultGuildProjection})
        // return guildData
        if(!guildData) {
            console.log('guild not found, refreshing data')
            return this.getGuildData(guildId, true, detailed, projection)
        }
        // remove playerId, replace with allyCode
        let playerIds = guildData.member.map(obj => obj.playerId)
        let playerData
        if(detailed) {
            playerData = await this.getAccountsData(playerIds, projection, 'playerId')
        } else {
            playerData = await this.getArenasData(playerIds, {allyCode: 1, playerId: 1}, 'playerId')
        }
        let idToAllyCode = playerData.reduce((map, obj) => (map[obj.playerId] = obj.allyCode, map), {})
        guildData.member.forEach(member => {
            member.allyCode = idToAllyCode[member.playerId] || ''
            delete member.playerId
        })

        // remove playerId from raid scores
        guildData.recentRaidResult.forEach(raidResult => {
            raidResult.raidMember.forEach(raidMember => {
                raidMember.allyCode = idToAllyCode[raidMember.playerId] || ''
                delete raidMember.playerId
            })
        })

        // add most recent raid score to player data
        if(guildData?.recentRaidResult?.length > 0) {
            let mostRecentRaid = guildData.recentRaidResult.reduce((max, curr) => {
                return (max.endTime > curr.endTime) ? max : curr
            }, guildData.recentRaidResult[0] )
            let allyCodeToScore = mostRecentRaid.raidMember.reduce((map, raidMember) => {
                map[raidMember.allyCode] = Number(raidMember?.memberProgress) || 0
                return map
            }, {})
            guildData.member.forEach(member => {
                member.raidScore = allyCodeToScore[member.allyCode]
            })
        }

        //remove raid member array from raid results
        guildData.recentRaidResult.forEach(raidResult => [
            delete raidResult.raidMember
        ])

        
        if(detailed) {
            let unitsMap = await this.getUnitsMap()
            guildData.roster = []
            guildData.rosterMap = {}
            guildData.datacronMap = {}
            
            playerData.forEach(player => {
                if(projection.rosterUnit !== undefined) {
                    populateRoster(unitsMap, player)
                    player.rosterMap = player.rosterUnit.reduce((map, obj) => (map[obj.defId] = obj, map), {})
                }
                
                if(projection.datacron) {
                    guildData.datacronMap[player.allyCode] = player.datacron
                }
                guildData.roster.push(player)
                guildData.rosterMap[player.allyCode] = player
            })

        }
        return guildData
    }

    async refreshGuild(guildId, detailed = false) {
        const { db } = await connectToDatabase()
        let response = await Comlink.getGuild(guildId)

        response.guild.lastRefreshed = Date.now()

        try{
            db.collection('guild').updateOne({'id': response.guild.profile.id}, {$set: response.guild}, {upsert: true})
        } catch(err) {
            throw handleDBError(err, 'Guild', 'add')
        }

        let playerIds = response.guild.member.map(player => player.playerId)
        if(detailed) {
            await Promise.allSettled(playerIds.map(async id => {
                await this.refreshPlayer({playerId: id})
            }))
        } else {
            await Promise.allSettled(playerIds.map(async id => {
                await this.refreshArena({playerId: id})
            }))
        }
    
        return `Guild [${response.guild.profile.name}] data refreshed`
    }

    async getGuildMemberDiscordRegistrations(guildId) {
        let guild = await this.getGuildData(guildId)
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
            accountsData = await this.getAccountsData(allyCodes, {_id: 0, allyCode: 1, name: 1, guildId: 1})
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
            guildData = await this.getAccountsData(allyCodes, {_id: 0, allyCode: 1, guildName: 1, guildId: 1})
        } catch(err) {
            throw handleDBError(err, 'Guild', 'get')
        }
        return guildData
    }

    async getPlayableUnits(filter={}, limit=0, projection={}) {
        const { db } = await connectToDatabase()

        let units
        try {
            units = await db.collection('units').find(filter, { projection: projection}).limit(limit).toArray()
        } catch(err) {
            throw handleDBError(err, 'Units', 'get')
        }

        return await this.localizedUnitsList(units, "ENG_US")
    }

    async localizedUnitsList(unitsList, lang) {
        const { db } = await connectToDatabase()

        let nameKeys = unitsList.map(unit => unit.nameKey)

        let localizedUnits
        try {
            localizedUnits = await db.collection(`Loc_${lang}`).find({key: {$in: nameKeys}}, {projection: {_id: 0, key: 1, value: 1}}).toArray()
        } catch(err) {
            throw handleDBError(err, 'Localization', 'get')
        }

        let localizationMap = localizedUnits.reduce((map, obj) => (map[obj.key] = obj.value, map), {})
        unitsList = unitsList.map(unit => {
            unit.nameKey = localizationMap[unit.nameKey] || unit.nameKey
            return unit
        })
        return unitsList
    }

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

    async setDefaultAccount(discordId, allyCode) {
        // const { db } = await connectToDatabase()
        // let accounts
        // try {
        //     accounts = await db.collection('discord_registration').find({discord_id: discordId}).toArray()
        //     await accounts.forEach(async account => {
        //         await db.collection('discord_registration').updateOne({allyCode: account.allyCode}, { $set: {default: account.allyCode === allyCode}})
        //     })
        // } catch(err) {
        //     throw handleDBError(err, 'Default Account', 'set')
        // }
        // return `Default Account is now set [allyCode=${allyCode}]`
        return 'This action is currently not in use. Please re-register the account and specify it to be your primary account.'
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
        // const { db } = await connectToDatabase()
        let {discordId, allyCode, name} = payload
        
        // try {
        //     let userAccountsCount = await db.collection('discord_registration').count({discord_id: discord_id})
        //     let defaultAccount = userAccountsCount === 0
        //     await db.collection('discord_registration').insertOne({discord_id: discord_id, allyCode: allyCode, default: defaultAccount})
        // } catch(err) {
        //     throw handleDBError(err, 'Registration', 'add')
        // }
        // return `${name} (${allyCode}) has been registered to <@${discord_id}>`
        return Registry.registerDiscordUser(discordId, allyCode)
    }

    async verifyUser(payload) {
        let {discordId, allyCode, isPrimary} = payload
        return Registry.verifyDiscordUser(discordId, allyCode, isPrimary)
    }

    async unregisterUser(payload) {
        // const { db } = await connectToDatabase()

        // let { discord_id, allyCode } = payload
        // //find account to be removed
        // let toBeRemoved = await db.collection('discord_registration').findOne({allyCode: allyCode})
        // // find list of all nondefault accounts
        // let nonDefaultCount = await db.collection('discord_registration').count({discord_id: discord_id, default: false})

        // // return error if problem getting info from db
        // if(!toBeRemoved) {
        //     throw new MyError(404, `Error unregistering, Cannot find user account`)
        // }

        // // cannot remove default accounts while nondefault are registered
        // if (toBeRemoved.default && nonDefaultCount) {
        //     throw new MyError(400, `Cannot remove main account while alt account exist [numAlts=${nonDefaultCount}]`)
        // }
        // try {
        //     // remove allycode from database
        //     await db.collection('discord_registration').deleteOne({allyCode: allyCode})
        // } catch(err) {
        //     throw handleDBError(err, 'Discord Registration', 'delete')
        // }
        
        // return `Account [allyCode=${allyCode}] has been unregistered from <@${discord_id}>`
        return 'This action is not currently in use. If somebody else is using this account, have them register and verify the account.'
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
                throw new MyError(400, `No documents were delered from the database for [serverId=${serverId},build=${build}]`)
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

    // Units functions

    async getUnits() {
        const { db } = await connectToDatabase()
        let response
        try {
            response = await db.collection('units').aggregate([
                {
                    "$lookup": {
                        from: "Loc_ENG_US",
                        localField: "nameKey",
                        foreignField: "key",
                        as: "nameKey"
                    }
                },
                {
                    "$unwind": {
                        path: "$nameKey"
                    }
                },
                {
                    "$project": {
                        "nameKey": 1,
                        "baseId": 1,
                        "combatType": 1,
                        "thumbnailName": 1,
                        "forceAlignment": 1
                    }
                }
            ]).toArray()
        } catch(err) {
            throw handleDBError(err, 'Units', 'get')
        }
        return response
    }
    async getUnitsMap() {
        return (await this.getUnits()).reduce((map, obj) => (map[obj.baseId] = obj, map), {})
    }
    async refreshUnits(latestGamedataVersion = undefined) {
        const { db } = await connectToDatabase()
        let units = await Comlink.getUnits(latestGamedataVersion)

        try {
            let bulk = units
            .filter(unit => unit.rarity === 7 && unit.obtainableTime === "0" && unit.obtainable)
            .map(unit => {
                return {
                    updateOne: {
                        filter: {id: unit.id},
                        update: {$set: unit},
                        upsert: true
                    }
                }
            })
            await db.collection('units').bulkWrite(bulk)
            // await Promise.all(units.map(async unit => {
            //     if(unit.rarity === 7 && unit.obtainableTime === "0" && unit.obtainable) {
            //         await db.collection('units').updateOne({ id: unit.id }, { $set: unit }, { upsert: true })
            //     }
            // }))
        } catch(err) {
            throw handleDBError(err, 'Units', 'set')
        }

        return "Units refreshed"
    }

    async refreshSkills(latestGamedataVersion = undefined) {
        const { db } = await connectToDatabase()
        let data = await Comlink.getUnitGameData(latestGamedataVersion)
        let skills = data["skill"]
        let categories = data['category']
        try {
            await Promise.all(skills.map(async skill => {
                await db.collection('skills').updateOne({ id: skill.id }, { $set: skill }, { upsert: true })
            }))
            await Promise.all(categories.map(async category => {
                await db.collection('category').updateOne({ id: category.id }, { $set: category }, { upsert: true })
            }))
        } catch(err) {
            throw handleDBError(err, 'Skills', 'Set')
        }
        return 'Skills refreshed.'
    }

    async refreshBattleTargetingRule(latestGamedataVersion = undefined) {
        const { db } = await connectToDatabase()
        let data = await Comlink.getBattleTargetingRule(latestGamedataVersion)
        try {
            let bulk = data.map(elt => {
                return {
                    updateOne: {
                        filter: {id: elt.id},
                        update: {$set: elt},
                        upsert: true
                    }
                }
            })
            await db.collection('battleTargetingRule').bulkWrite(bulk)
        } catch(err) {
            throw handleDBError(err, 'battleTargetingRule', 'Set')
        }
    }

    async refreshDatacron(latestGamedataVersion = undefined) {
        const { db } = await connectToDatabase()
        let data = await Comlink.getDatacronData(latestGamedataVersion)
        try {
            for(const {key, value} of data) {
                let bulk = value.map(elt => {
                    return {
                        updateOne: {
                            filter: {id: elt.id},
                            update: {$set: elt},
                            upsert: true
                        }
                    }
                })
                await db.collection(key).bulkWrite(bulk)
            }
        } catch(err) {
            throw handleDBError(err, 'Datacron', 'Set')
        }
    }

    async refreshPlayerPortraits(latestGamedataVersion = undefined) {
        const { db } = await connectToDatabase()
        let data = await Comlink.getPlayerPortraitData(latestGamedataVersion)
        try {
            let bulk = data.map(elt => {
                return {
                    updateOne: {
                        filter: {id: elt.id},
                        update: {$set: elt},
                        upsert: true
                    }
                }
            })
            await db.collection('playerPortrait').bulkWrite(bulk)
        } catch(err) {
            throw handleDBError(err, 'playerPortrait', 'Set')
        }
    }

    async refreshTerritoryBattleDefinition(latestGamedataVersion = undefined) {
        const { db } = await connectToDatabase()
        let data = await Comlink.getTerritoryBattle(latestGamedataVersion)
        try {
            let bulk = data.map(elt => {
                return {
                    updateOne: {
                        filter: {id: elt.id},
                        update: {$set: elt},
                        upsert: true
                    }
                }
            })
            await db.collection('territoryBattleDefinition').bulkWrite(bulk)
        } catch(err) {
            throw handleDBError(err, 'territoryBattleDefinition', 'Set')
        }
    }

    async refreshAbility(latestGamedataVersion = undefined) {
        const { db } = await connectToDatabase()
        let data = await Comlink.getAbility(latestGamedataVersion)
        try {
            let bulk = data.map(elt => {
                return {
                    updateOne: {
                        filter: {id: elt.id},
                        update: {$set: elt},
                        upsert: true
                    }
                }
            })
            await db.collection('ability').bulkWrite(bulk)
        } catch(err) {
            throw handleDBError(err, 'ability', 'Set')
        }
    }

    async refreshMaterial(latestGamedataVersion = undefined) {
        const { db } = await connectToDatabase()
        let data = await Comlink.getMaterial(latestGamedataVersion)
        try {
            let bulk = data.map(elt => {
                return {
                    updateOne: {
                        filter: {id: elt.id},
                        update: {$set: elt},
                        upsert: true
                    }
                }
            })
            await db.collection('material').bulkWrite(bulk)
        } catch(err) {
            throw handleDBError(err, 'material', 'Set')
        }
    }

    async refreshEquipment(latestGamedataVersion = undefined) {
        const { db } = await connectToDatabase()
        let data = await Comlink.getEquipment(latestGamedataVersion)
        try {
            let bulk = data.map(elt => {
                return {
                    updateOne: {
                        filter: {id: elt.id},
                        update: {$set: elt},
                        upsert: true
                    }
                }
            })
            await db.collection('equipment').bulkWrite(bulk)
        } catch(err) {
            throw handleDBError(err, 'equipment', 'Set')
        }
    }

    // Datacron functions

    async getActiveDatacrons() {
        const { db } = await connectToDatabase()
        let activeSets = await db.collection('datacronSet').find({"expirationTimeMs": {$gt: Date.now().toString()}}).toArray()

        let setIds = activeSets.map(set => set.id)
        let activeTemplates = await db.collection('datacronTemplate').find({"setId": {$in: setIds}}).toArray()
        activeTemplates.forEach(activeTemplate => {
            switch(activeTemplate.id) {
                case 'datacron_set_15_padawanobiwan':
                    handlePOWTemplate(activeTemplates)
                    break
                case 'datacron_set_16_nighttrooper':
                    handleNightTrooperTemplate(activeTemplates)
                    break
                case 'datacron_set_17_greatmothers':
                    handleGreatMothersTemplate(activeTemplates)
                    break
                case 'datacron_set_18_baylanskoll':
                    handleBaylanSkollTemplate(activeTemplates)
                    break
                default:
                    break
            }
        })
        activeTemplates = activeTemplates.filter(template => template.referenceTemplateId === '')
        let activeTemplatesMap = activeTemplates.reduce((map, obj) => (map[obj.setId] = obj, map), {})

        let relevantAffixes = activeTemplates.map(template => template.tier.map(tier => tier.affixTemplateSetId)).flat().flat()
        let affixes = await db.collection('datacronAffixTemplateSet').find({"id": {$in: relevantAffixes}}).toArray()
        let affixesMap = affixes.reduce((map, obj) => (map[obj.id] = obj, map), {})

        let targetRuleIdList = affixes.map(affix => affix.affix.map(elt => elt.targetRule).flat()).flat().filter(str => str !== "")
        let targetRuleList = await db.collection('battleTargetingRule').find({id: {$in: targetRuleIdList}}).toArray()
        let targetRuleMap = targetRuleList.reduce((map, obj) => (map[obj.id] = obj, map), {})
        
        let categoryIdList = targetRuleList.map(targetRule => targetRule.category.category.find(obj => !obj.exclude).categoryId)
        let categoryList = await db.collection('category').find({id: {$in: categoryIdList}}).toArray()
        let categoryMap = categoryList.reduce((map, obj) => (map[obj.id] = obj.descKey, map), {})

        let abilityList = await db.collection('ability').find({id: {$in: affixes.map(affix => affix.affix.map(elt => elt.abilityId)).flat()}}, {projection: {id: 1, descKey: 1}}).toArray()
        let abilityKeyList = abilityList.map(ability => ability.descKey)
        let abilityMap = abilityList.reduce((map, obj) => (map[obj.id] = obj.descKey, map), {})

        let toLocalize = [...activeSets.map(set => set.displayName), ...abilityKeyList, ...categoryList.map(category => category.descKey)]
        let localizationData = await db.collection('Loc_ENG_US').find({key: {$in: toLocalize}}).toArray()
        let localizationMap = localizationData.reduce((map, obj) => (map[obj.key] = obj.value, map), {})

        // return affixes
        return activeSets.map(set => {
            let setId = set.id
            let activeTemplate = activeTemplatesMap[String(setId)]
            return {
                id: setId,
                name: localizationMap[set.displayName],
                icon: set.icon,
                tier: activeTemplate.tier.map((tier, index) => {
                        let type = index === 2 ? 'alignment' : index === 5 ? 'faction' : index === 8 ? 'character' : 'stat'

                        let stats, bonuses
                        if(type === 'stat') {
                            stats = tier.affixTemplateSetId.map(id => {
                                let affix = affixesMap[id].affix
                                return affix.map(elt => {
                                    return {
                                        statType: elt.statType,
                                        statValueMin: elt.statValueMin,
                                        statValueMax: elt.statValueMax,
                                        setId: setId
                                    }
                                })
                            })
                        } else {
                            bonuses = tier.affixTemplateSetId.map(id => {
                                let affix = affixesMap[id].affix
                                
                                return affix.map(elt => {
                                    let abilityId = elt.abilityId
                                    let targetRule = elt.targetRule
                                    let tag = getTags(elt)
                                    let categoryId = targetRuleMap[targetRule].category.category.find(obj => !obj.exclude).categoryId
                                    let categoryName = localizationMap[categoryMap[categoryId]]
                                    return {
                                        key: `${abilityId}:${targetRule}`,
                                        abilityId: abilityId,
                                        targetRule: targetRule,
                                        tag: tag,
                                        setId: setId,
                                        categoryId: categoryId,
                                        categoryName: categoryName,
                                        value: localizationMap[abilityMap[abilityId]]?.replaceAll('{0}', categoryName)
                                    }
                                })
    
                            })
                        }
                        return {
                            type: type,
                            stats: stats,
                            bonuses: bonuses
                        }
                    })
            }
        })
    }

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

        let response
        try {
            response = await db.collection('datacronNames').updateOne({allyCode: body.allyCode}, {$set: body}, {upsert: true})
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
        let response
        try {
            response = await db.collection('serverRegistration').updateOne({build: "gac", serverId: serverId}, {$set: {channelId: channelId, messageId: messageId}})
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
        let response
        try {
            response = await db.collection('serverRegistration').updateOne({build: "gac", serverId: serverId}, {$addToSet: {accounts: allyCode}})
        } catch(err) {
            throw handleDBError(err, "GAC Leaderboard", "add allyCode")
        }
        return `AllyCode [allyCode=${allyCode}] added to leaderboard.`
    }

    async removeAccountFromLeaderboard(allyCode, serverId) {
        const { db } = await connectToDatabase()
        let response
        try {
            response = await db.collection('serverRegistration').updateOne({build: "gac", serverId: serverId}, {$pull: {accounts: allyCode}})
        } catch(err) {
            throw handleDBError(err, "GAC Leaderboard", "remove allyCode")
        }
        return `AllyCode [allyCode=${allyCode}] removed from leaderboard.`
    }

    async getAccountsFromAllyCodeArray(allyCodes, projection) {
        const { db } = await connectToDatabase()

        let response
        try {
            response = await this.getArenasData(allyCodes, projection)
        } catch(err) {
            throw handleDBError(err, 'Player', 'get')
        }
        return response
    }

    async refreshAccountsInLeaderboard(serverId) {
        let leaderboard = await this.getLeaderboard(serverId)

        let allyCodes = leaderboard.accounts
        await Promise.all(allyCodes.map(async allyCode => {
            await this.refreshArena({allyCode : allyCode})
        }))

        return `Accounts for leaderboard [serverId=${serverId}] refreshed.`
    }

    // Tasks

    async getTasks(filter) {
        const { db } = await connectToDatabase()

        const { completed, timestamp, location } = filter
        console.log(filter)
        let response
        try {
            response = await db.collection('task').find({completed: completed, location: location, timestamp: { $lte : new Date(timestamp).toISOString() }}).toArray()
        } catch(err) {
            throw handleDBError(err, 'Tasks', 'get')
        }
        return response
    }

    // Mhann endpoints

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
    async getVisibleCategoryList() {
        const { db } = await connectToDatabase()
    
        let response
        try {
            response = await db.collection("category").find({ visible: true }).toArray()
        } catch(err) {
            throw handleDBError(err, 'Category', 'get')
        }
        
        return this.localizeList(response, "ENG_US", ["descKey"])
    }

    async getCategoryList() {
        const { db } = await connectToDatabase()
    
        let response
        try {
            response = await db.collection("category").find().toArray()
        } catch(err) {
            throw handleDBError(err, 'Category', 'get')
        }
        
        return this.localizeList(response, "ENG_US", ["descKey"])
    }

    /**
     * Will localize a list of objects by the specified language on the specified keys
     * @param {*} list 
     * @param {*} lang 
     * @param {*} keys 
     */
    async localizeList(list, lang, keys) {
        const { db } = await connectToDatabase()
            
        let toLocalize = list.reduce((arr, item) => {
            let values = keys.map(key => item[key])
            arr.push(...values)
            return arr
        }, [])

        let localizeList
        try {
            localizeList = await db.collection(`Loc_${lang}`).find({key: {$in: toLocalize}}, {projection: {_id: 0, key: 1, value: 1}}).toArray()
        } catch(err) {
            throw handleDBError(err, 'Localization', 'get')
        }

        let localizationMap = localizeList.reduce((map, obj) => (map[obj.key] = obj.value, map), {})
        return list.map(item => {
            keys.forEach(key => {
                item[key] = localizationMap[item[key]] || item[key]
            })
            return item
        })
    }

    async getSkills() {
        const { db } = await connectToDatabase()
    
        let response
        try {
            response = await db.collection("skills").find().toArray()
        } catch(err) {
            throw handleDBError(err, 'Skills', 'get')
        }
        
        return response
    }

    async getPortraits() {
        const { db } = await connectToDatabase()

        let response
        try {
            response = await db.collection("playerPortrait").find().toArray()
        } catch(err) {
            throw handleDBError(err, "playerPortrait", "get")
        }
        return response
    }

    async getPortrait(id) {
        const { db } = await connectToDatabase()

        let response
        try {
            response = await db.collection("playerPortrait").findOne({id: id})
        } catch(err) {
            throw handleDBError(err, "playerPortrait", "get")
        }
        return response
    }

    async getCurrency() {
        const { db } = await connectToDatabase()

        let response
        try {
            response = await db.collection("currency").find().toArray()
        } catch(err) {
            throw handleDBError(err, "currency", "get")
        }
        return this.localizeList(response, "ENG_US", ["nameKey"])
    }

    async getMaterial() {
        const { db } = await connectToDatabase()

        let response
        try {
            response = await db.collection("material").find({}, {projection: {_id: 0, id: 1, descKey: 1, nameKey: 1, iconKey: 1, rarity: 1}}).toArray()
        } catch(err) {
            throw handleDBError(err, "material", "get")
        }
        return this.localizeList(response, "ENG_US", ["nameKey", "descKey"])
    }

    async getEquipment() {
        const { db } = await connectToDatabase()

        let response
        try {
            response = await db.collection("equipment").find({}, {projection: {_id: 0, id: 1, mark: 1, nameKey: 1, iconKey: 1, tier: 1}}).toArray()
        } catch(err) {
            throw handleDBError(err, "equipment", "get")
        }
        return this.localizeList(response, "ENG_US", ["nameKey"])
    }

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

    async refreshLocalization(latestLocalizationBundleVersion = undefined) {
        const { db } = await connectToDatabase()
        let result = await Comlink.getLocalization(latestLocalizationBundleVersion)
        let decodedBuffer = Buffer.from(result['localizationBundle'], 'base64')

        const regexList = [
            /^UNIT_.*_NAME(_?V[2-9])?\|.*/g,
            /^CATEGORY_.*\|.*/g,
            /^DATACRON_.*\|.*/g,
            /^ForceAlignment.*\|.*/g,
            /^MATERIAL.*\|.*/g,
            /^SCV.*\|.*/g,
            /^RM.*\|.*/g,
            /^COAXIUM.*\|.*/g,
            /^XP_ITEM.*\|.*/g,
            /^SHIP_XP_ITEM.*\|.*/g,
            /^SKILL.*\|.*/g,
            /^CREDIT.*\|.*/g,
            /^MOD.*\|.*/g,
            /^EQUIPMENT.*\|.*/g,
            /^Shared_Currency.*\|.*/g,
            /^SHARED_.*CURRENCY.*\|.*/g
        ]
    
        await decompress(decodedBuffer)
        .then(async files => {
            let localizations = []
            await Promise.all(files.map(async file => {
                if(file.type === 'file' && file.path === 'Loc_ENG_US.txt') {
                    let collection = file.path.replace(/\.[^/.]+$/, "")
                    let fileLines = file.data.toString().split('\n')
                    localizations.push(collection)

                    let bulk = fileLines.reduce((filtered, line) => {
                        if(regexList.some(regex => line.match(regex))) {
                            let split = line.split('|')
                            let entry = {
                                key: split[0],
                                value: split[1]
                            }
                            filtered.push({
                                updateOne: {
                                    filter: {key: entry.key},
                                    update: {$set: entry},
                                    upsert: true
                                }
                            })
                        }
                        return filtered
                    }, [])
                    
                    await db.collection(collection).bulkWrite(bulk)
                }
            }))
        })
        return 'Localizations Refreshed'
    }

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
        // return true // uncomment to do dev work
        let user = await this.sessionToDiscord(sessionId)
        let account = (await this.getAccountsByDiscordId(user.id)).filter(account => account.guildId === guildId)
        let guild = await this.getGuildData(guildId)
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

    // Arena commands

    async addArena(payload) {
        let { allyCode } = payload
        const { db } = await connectToDatabase()

        try {
            await db.collection('arena').updateOne({ allyCode: allyCode }, { $set: payload }, { upsert: true })
            await this.refreshArena({allyCode : allyCode})
        } catch(err) {
            throw handleDBError(err, 'arena', 'set')
        }

    }

    async removeArena(allyCode) {
        const { db } = await connectToDatabase()

        try {
            await db.collection('arena').deleteOne({allyCode: allyCode})
            await db.collection('playerArena').deleteOne({allyCode: allyCode})
        } catch(err) {
            throw handleDBError(err, "arena/playerArena", 'remove')
        }
    }

    async getArena(allyCode) {
        const { db } = await connectToDatabase()

        let arena, playerArena
        try {
            arena = await db.collection('arena').findOne({allyCode: allyCode})
            playerArena = await db.collection('playerArena').findOne({allyCode: allyCode})
        } catch(err) {
            throw handleDBError(err, 'arena/playerArena', 'get')
        }
        return {
            arena: arena,
            playerArena: playerArena
        }
    }

    async getArenas() {
        const { db } = await connectToDatabase()

        let arenas
        try {
            arenas = await db.collection('arena').find().toArray()
        } catch(err) {
            throw handleDBError(err, 'arena', 'get')
        }
        return arenas
    }

    async checkArena(allyCode) {
        let cachedArena = await this.getArena(allyCode)
        let currentArena = await this.refreshArena({allyCode : allyCode})

        return {
            arena: cachedArena.arena,
            oldPlayerArena: cachedArena.playerArena,
            newPlayerArena: currentArena
        }
    }

    async refreshArena(payload) {
        const { db } = await connectToDatabase()
        let playerArena
        try {
            playerArena = await Comlink.getPlayerArena(payload)
            await db.collection('playerArena').updateOne({ playerId: playerArena.playerId }, { $set: playerArena }, { upsert: true })
        } catch(err) {
            throw handleDBError(err, 'playerArena', 'set')
        }

        return playerArena
    }

    // Data (infographics)

    async getData(type) {
        const { db } = await connectToDatabase()
        let response
        try {
            response = await db.collection('data').findOne({type: type})
        } catch(err) {
            throw handleDBError(err, 'data', 'get')
        }
        return response
    }

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

    async getCurrentGACBoard(session, allyCode) {
        let gameConnectionArray = await this.getGameConnection(session, allyCode)
        if(gameConnectionArray.length === 0) {
            throw new MyError(400, 'No game connection associated with this user')
        }
        let gameConnection = gameConnectionArray[0]
        let gacBoard = await getCurrentGAC(gameConnection.sessionId)
        return {
            league: gacBoard.gac.groupId.split(':')[2],
            mode: gacBoard.gac.tournamentMapId.includes('5v5') ? 5 : 3,
            opponent: {allyCode: String(gacBoard.gac.away.player.allyCode)},
            home: getSquads(gacBoard.gac.home),
            homeDatacrons: getDatacrons(gacBoard.gac.home),
            away: getSquads(gacBoard.gac.away),
            awayDatacrons: getDatacrons(gacBoard.gac.away)
        }
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

    async addGGReports(reports) {
        const { db } = await connectToDatabase()
        try {
            await db.collection('gacHistory').insertMany(reports)
        } catch(err) {
            throw handleDBError(err, 'gac-report', 'set')
        }
        return `Reports added to DB.`
    }

    async getGGReports(mode, combatType, allyCode, win) {
        const { db } = await connectToDatabase()
        let response
        try {
            response = await db.collection('gacHistory').find({mode: mode, combatType: combatType, allyCode: allyCode, win: win}).toArray()
        } catch(err) {
            throw handleDBError(err, 'gacHistory', 'get')
        }
        return response
    }

}

async function populateRoster(unitsMap, player) {
    player.rosterUnit.forEach(unit => {
        let match = new RegExp("^([A-Z0-9_]+):[A-Z_]+$", "g").exec(unit.definitionId)
        if(match) {
            let defId = match[1]
            unit.defId = defId
            let unitDetails = unitsMap[defId]
            unit.nameKey = unitDetails["nameKey"]["value"]
            unit.combatType = unitDetails["combatType"]
        }
    })
}

function handleDBError(err, obj, action) {
    if(err.code === 11000) {
        return new MyError(500, `${obj} already exists in the database.`, err)
    } else {
        return new MyError(500, `There was an error in the database: [action=${action},obj=${obj}]`, err)
    }
}

function zetaCount(unit, skillMap) {
    let count = 0
    unit.skill?.forEach(({id, tier}) => {
        let skill = skillMap[id]
        for(let i = 0; i <= tier; ++i) {
            count += skill.tier[i].isZetaTier && !skill.tier[i].isOmicronTier ? 1 : 0
        }
    })
    return count
}

function omicronCount(unit, skillMap) {
    let count = 0
    unit.skill?.forEach(({id, tier}) => {
        let skill = skillMap[id]
        for(let i = 0; i <= tier; ++i) {
            count += skill.tier[i].isOmicronTier ? 1 : 0
        }
    })
    return count
}

function getSquads(board) {
    return board.zones.map(zone => {
        if(zone.squads.length) {
            return zone.squads.map(squad => squad.units.map(unit => unit.baseId))
        } else {
            return new Array(zone.squadCount).fill([])
        }
    })
}

function getDatacrons(board) {
    return board.zones.map(zone => zone.squads.map(squad => squad?.datacron?.id || ""))
}

export default new DB()