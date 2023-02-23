import { connectToDatabase } from "../utils/mongodb.js"
import Comlink from './comlink.js'
import decompress from 'decompress'
import { MyError } from "./error.js"
import { getImage } from "./hu.js"
import { ObjectId } from "mongodb"

class DB {

    constructor() {
        this.S3_URL = ''
    }

    //Player functions
    async getPlayerData(payload, refresh, projection) {
        const { db } = await connectToDatabase()
        if (refresh) {
            await this.refreshPlayer(payload)
        }
        let response = await db.collection('player').findOne(payload, {projection: projection})
        if (!response) {
            throw new MyError(404, `Player not found in the database`)
        }
        response.playerId = ''
        return response
    }

    async refreshPlayer(payload) {
        const { db } = await connectToDatabase()
        let comlinkResponse = await Comlink.getPlayer(payload)
        let allyCode = comlinkResponse.allyCode

        // removes mod data from each unit (very space heavy)
        comlinkResponse.rosterUnit = comlinkResponse.rosterUnit.map(({equippedStatMod, ...rest}) => rest)
        try {
            await db.collection('player').updateOne({ allyCode: allyCode }, { $set: comlinkResponse }, { upsert: true })
        } catch(err) {
            throw handleDBError(err, 'Player', 'update')
        }
        return `Player data [allyCode=${allyCode}] refreshed`
    }

    //Guild functions
    async getGuildData(guildId, refresh=false, detailed=false, projection={}) {
        if(detailed && !projection) { // trying to get all data for all guild members
            throw new MyError(403, "You absolutely will brick this system if you try this. Include a projection if you would like detailed guild member information.")
        }
        const { db } = await connectToDatabase()
        if(refresh) {
            await this.refreshGuild(guildId, detailed)
        }
        let guildData = await db.collection('guild').findOne({id: guildId})
        if(!guildData) {
            throw new MyError(404, `Error retrieving guild data from database [guildId=${guildId}]`)
        }
        // remove playerId, replace with allyCode
        let playerIds = guildData.member.map(obj => obj.playerId)
        let playerData = await db.collection('player').find({playerId: {$in: playerIds}}, {projection: {allyCode: 1, playerId: 1}}).toArray()
        let idToAllyCode = playerData.reduce((map, obj) => (map[obj.playerId] = obj.allyCode, map), {})
        guildData.member.forEach(member => {
            member.allyCode = idToAllyCode[member.playerId] || ''
            member.playerId = ''
        })
        
        if(detailed) {
            let unitsMap = await this.getUnitsMap()
            guildData.roster = []
            guildData.rosterMap = {}

            let playerAllyCodes = guildData.member.map(obj => obj.allyCode).filter(allyCode => allyCode !== '')
            let playerData
            try {
                playerData = await db.collection('player').find({allyCode: {$in: playerAllyCodes}}, {projection: projection}).toArray()
            } catch(err) {
                throw handleDBError(err, 'Guild', 'get')
            }

            playerData.forEach(player => {
                populateRoster(unitsMap, player)
                player.rosterMap = player.rosterUnit.reduce((map, obj) => (map[obj.defId] = obj, map), {})
                guildData.roster.push(player)
                guildData.rosterMap[player.allyCode] = player
            })
        }
        return guildData
    }

    async refreshGuild(guildId, detailed = false) {
        const { db } = await connectToDatabase()
        let response = await Comlink.getGuild(guildId)

        try{
            db.collection('guild').updateOne({'id': response.guild.profile.id}, {$set: response.guild}, {upsert: true})
        } catch(err) {
            throw handleDBError(err, 'Guild', 'add')
        }

        if(detailed) {
            let playerIds = response.guild.member.map(player => player.playerId)
            await Promise.all(playerIds.map(async id => {
                await this.refreshPlayer({playerId: id})
            }))
        }
    
        return `Guild [${response.guild.profile.name}] data refreshed`
    }

    async getGuildMemberDiscordRegistrations(guildId) {
        const { db } = await connectToDatabase()
        let guild = await this.getGuildData(guildId)
        let guildAllyCodes = guild.member.map(member => member.allyCode)

        let discordRegistrations
        try {
            discordRegistrations = await db.collection('discord_registration').find({allyCode: { $in: guildAllyCodes}}).toArray()
        } catch(err) {
            throw handleDBError(err, 'Discord Registrations', 'get')
        }
        return discordRegistrations
    }

    //Discord functions
    async getDiscordRegistrations(discordId) {
        const { db } = await connectToDatabase()

        let accounts
        try {
            accounts = await db.collection('discord_registration').find({discord_id: discordId}).toArray()
        } catch(err) {
            throw handleDBError(err, 'Guild Registration', 'get')
        }

        return accounts
    }

    async getAccountsByDiscordId(discordId) {
        const { db } = await connectToDatabase()
        let accounts = await this.getDiscordRegistrations(discordId)
        let allyCodes = accounts.map(account => account.allyCode)
        let defaultMap = accounts.reduce((map, obj) => (map[obj.allyCode] = obj.default, map), {})
        let accountsData
        try {
            accountsData = await db.collection('player').find({allyCode: {$in: allyCodes}}, {projection: {_id: 0, allyCode: 1, name: 1, guildId: 1}}).toArray()
        } catch(err) {
            throw handleDBError(err, 'Player', 'get')
        }
        return accountsData.sort((a,b) => defaultMap[a.allyCode] ? -1 : defaultMap[b.allyCode] ? 1 : 0)
    }

    async getGuildsByDiscordId(discordId) {
        const { db } = await connectToDatabase()

        let accounts = await this.getDiscordRegistrations(discordId)

        let allyCodes = accounts.map(account => account.allyCodes)

        let guildData
        try {
            guildData = await db.collection('player').find({allyCode: {$in: allyCodes}}, {projection: {_id: 0, allyCode: 1, guildName: 1}}).toArray()
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

        let discordRegistration, account
        try {
            discordRegistration = await db.collection('discord_registration').findOne({discord_id: discordId, default: true})
            account = await db.collection('player').findOne({allyCode: discordRegistration.allyCode})
        } catch(err) {
            throw handleDBError(err, 'Default Account', 'get')
        }
        return account
    }

    async setDefaultAccount(discordId, allyCode) {
        const { db } = await connectToDatabase()
        let accounts
        try {
            accounts = await db.collection('discord_registration').find({discord_id: discordId}).toArray()
            await accounts.forEach(async account => {
                await db.collection('discord_registration').updateOne({allyCode: account.allyCode}, { $set: {default: account.allyCode === allyCode}})
            })
        } catch(err) {
            throw handleDBError(err, 'Default Account', 'set')
        }
        return `Default Account is now set [allyCode=${allyCode}]`
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
        const { db } = await connectToDatabase()
        let {discord_id, allyCode, name} = payload
        
        try {
            let userAccountsCount = await db.collection('discord_registration').count({discord_id: discord_id})
            let defaultAccount = userAccountsCount === 0
            await db.collection('discord_registration').insertOne({discord_id: discord_id, allyCode: allyCode, default: defaultAccount})
        } catch(err) {
            throw handleDBError(err, 'Registration', 'add')
        }
        return `${name} (${allyCode}) has been registered to <@${discord_id}>`
    }

    async unregisterUser(payload) {
        const { db } = await connectToDatabase()

        let { discord_id, allyCode } = payload
        //find account to be removed
        let toBeRemoved = await db.collection('discord_registration').findOne({allyCode: allyCode})
        // find list of all nondefault accounts
        let nonDefaultCount = await db.collection('discord_registration').count({discord_id: discord_id, default: false})

        // return error if problem getting info from db
        if(!toBeRemoved) {
            throw new MyError(404, `Error unregistering, Cannot find user account`)
        }

        // cannot remove default accounts while nondefault are registered
        if (toBeRemoved.default && nonDefaultCount) {
            throw new MyError(400, `Cannot remove main account while alt account exist [numAlts=${nonDefaultCount}]`)
        }
        try {
            // remove allycode from database
            await db.collection('discord_registration').deleteOne({allyCode: allyCode})
        } catch(err) {
            throw handleDBError(err, 'Discord Registration', 'delete')
        }
        
        return `Account [allyCode=${allyCode}] has been unregistered from <@${discord_id}>`
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

    async registerServer(serverId, build) {
        const { db } = await connectToDatabase()
        try {
            let serverListing = await db.collection('serverListing').findOne({build: build})
            let isPublic = serverListing.public
            if(isPublic || serverListing.list.includes(serverId)) {
                await db.collection('serverRegistration').insertOne({serverId: serverId, serverType: build})
            } else {
                throw new MyError(401, `You cannot register for this type of server [build=${build}]`)
            }
        } catch(err) {
            throw handleDBError(err, 'Server Registration', 'set')
        }
        return `Server [serverId=${serverId}] registered [build=${build}]]`
    }

    async unregisterServer(serverId, build) {
        const { db } = await connectToDatabase()
        try {
            await db.collection('serverRegistration').deleteOne({serverId: serverId, serverType: build})
        } catch(err) {
            throw handleDBError(err, 'Server Registration', 'delete')
        }
        return `Server [serverId=${serverId}] unregistered [build=${build}]]`
    }

    async getActiveBuilds(serverId) {
        const { db } = await connectToDatabase()
        let response
        try {
            response = await db.collection('serverRegistration').find({serverId: serverId}).toArray()
        } catch(err) {
            throw handleDBError(err, 'Server Registration', 'get')
        }
        return response
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
    async refreshUnits() {
        const { db } = await connectToDatabase()
        let units = await Comlink.getUnits()
        try {
            await Promise.all(units.map(async unit => {
                if(unit.rarity === 7 && unit.obtainableTime === "0" && unit.obtainable) {
                    await db.collection('units').updateOne({ id: unit.id }, { $set: unit }, { upsert: true })
                }
            }))
        } catch(err) {
            throw handleDBError(err, 'Units', 'set')
        }

        return "Units refreshed"
    }

    async refreshSkills() {
        const { db } = await connectToDatabase()
        let data = await Comlink.getUnitGameData()
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

    //Misc functions

    async getCategoryList() {
        const { db } = await connectToDatabase()
    
        let response
        try {
            response = await db.collection("category").find({ visible: true }).toArray()
        } catch(err) {
            throw handleDBError(err, 'Category', 'get')
        }
        
        return this.localizeCategoryList(response, "ENG_US")
    }

    async localizeCategoryList(categoryList, lang) {
        const { db } = await connectToDatabase()

        let descKeys = categoryList.map(unit => unit.descKey)

        let localizedCategories
        try {
            localizedCategories = await db.collection(`Loc_${lang}`).find({key: {$in: descKeys}}, {projection: {_id: 0, key: 1, value: 1}}).toArray()
        } catch(err) {
            throw handleDBError(err, 'Localization', 'get')
        }

        let localizationMap = localizedCategories.reduce((map, obj) => (map[obj.key] = obj.value, map), {})
        categoryList = categoryList.map(category => {
            category.descKey = localizationMap[category.descKey] || category.descKey
            return category
        })
        return categoryList
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

    async getPlatoons(tb, ls_phase, mix_phase, ds_phase) {
        const { db } = await connectToDatabase()
        let platoonData = await db.collection('platoons').find({tb: tb, $or: [
            {alignment: "LS", phase: ls_phase},
            {alignment: "Mix", phase: mix_phase},
            {alignment: "DS", phase: ds_phase}
        ]}).toArray()
        return {
            "LS": platoonData.filter(obj => obj.alignment === "LS"),
            "Mix": platoonData.filter(obj => obj.alignment === "Mix"),
            "DS": platoonData.filter(obj => obj.alignment === "DS")
        }
    }

    async refreshLocalization() {
        const { db } = await connectToDatabase()
        let result = await Comlink.getLocalization()
        let decodedBuffer = Buffer.from(result['localizationBundle'], 'base64')
    
        await decompress(decodedBuffer)
        .then(async files => {
            let localizations = []
            await Promise.all(files.map(async file => {
                if(file.type === 'file' && file.path === 'Loc_ENG_US.txt') {
                    let collection = file.path.replace(/\.[^/.]+$/, "")
                    let fileLines = file.data.toString().split('\n')
                    localizations.push(collection)
                    await Promise.all(fileLines.map(async line => {
                        if(line.match(/^UNIT_.*_NAME(_?V[2-9])?\|.*/g) || line.match(/^CATEGORY_.*\|.*/g)) {
                            let split = line.split('|')
                            let entry = {
                                key: split[0],
                                value: split[1]
                            }
                            await db.collection(collection).updateOne({key: entry.key}, {$set: entry}, {upsert: true})
                        }
                    }))
                }
            }))
        })
        return 'Localizations Refreshed'
    }

    async getUnitImage(baseId) {
        const { db } = await connectToDatabase()

        let response
        try {
            response = await db.collection('images').findOne({baseId: baseId})
        } catch(err) {
            throw handleDBError(err, 'Unit Image', 'get')
        }
        return response
    }
    async refreshImages() {
        const { db } = await connectToDatabase()
        // get all thumbnails for each unit
        let units
        try {
            units = await db.collection('units').find({rarity: 7}, {projection: {"thumbnailName": 1, 'baseId': 1}}).toArray()
        } catch(err) {
            throw handleDBError(err, 'Unit Image', 'get')
        }
        
        try {
            await Promise.all(units.map(async unit => {
                let thumbnail = unit.thumbnailName
                let baseId = unit.baseId
                let image = await getImage(thumbnail)
                await db.collection('images').updateOne({baseId: baseId}, {$set: {thumbnail: thumbnail, image: image, baseId: baseId}}, {upsert: true})
            }))
        } catch(err) {
            throw handleDBError(err, 'Unit Image', 'set')
        }

        return 'Refreshing images complete'
    }

    async getImages() {
        const { db } = await connectToDatabase()
        let playableUnitBaseIds = (await this.getPlayableUnits({obtainableTime: "0", rarity: 7}, 0, {baseId: 1})).map(unit => unit.baseId)
        let response
        try {
            response = await db.collection('images').find({baseId: {$in: playableUnitBaseIds}}).toArray()
        } catch(err) {
            throw handleDBError(err, 'Unit Images', 'get')
        }
        return response
    }

    async beginSession(sessionId) {
        const { db } = await connectToDatabase()
        try {
            await db.collection('session').insertOne({sessionId: sessionId, user: null})
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

    async authenticateSession(sessionId, discordUser) {
        const { db } = await connectToDatabase()
        try {
            await db.collection('session').updateOne({sessionId: sessionId, discordId: null}, {$set: {user: discordUser}})
        } catch(err) {
            throw handleDBError(err, 'Session', "patch")
        }
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

    async addGAC(id, gac) {
        const { db } = await connectToDatabase()
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
        let gacId = response.insertedId || id
        return await db.collection('gac').findOne({_id: new ObjectId(gacId)})
    }

    async getAllGAC(allyCode) {
        const { db } = await connectToDatabase()
        let response
        try {
            response = await db.collection('gac').find({'player.allyCode': allyCode}).toArray()
        } catch(err) {
            handleDBError(err, 'gac', 'get')
        }
        return response
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

    async addGGReports(reports) {
        const { db } = await connectToDatabase()
        try {
            await db.collection('gacHistory').insertMany(reports)
        } catch(err) {
            throw handleDBError(err, 'gac-report', 'set')
        }
        return `Reports added to DB.`
    }

    async getGGReports(filter = {}) {
        const { db } = await connectToDatabase()
        let response
        try {
            response = await db.collection('gacHistory').find(filter).toArray()
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

export default new DB()

