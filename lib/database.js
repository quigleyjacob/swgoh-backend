import { connectToDatabase } from "../utils/mongodb.js"
import Comlink from './comlink.js'
import decompress from 'decompress'
import { MyError } from "./error.js"
import { getImage } from "./hu.js"

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
            throw new MyError(404, `Player [${JSON.stringify(payload)}] not found in the database`)
        }
        return response
    }
    async refreshPlayer(payload) {
        const { db } = await connectToDatabase()
        let comlinkResponse = await Comlink.getPlayer(payload)
        let allyCode = comlinkResponse.allyCode
        let playerId = comlinkResponse.playerId

        // removes mod data from each unit (very space heavy)
        comlinkResponse.rosterUnit = comlinkResponse.rosterUnit.map(({skill, equippedStatMod, ...rest}) => rest)
        try {
            await db.collection('player').updateOne({ playerId: playerId }, { $set: comlinkResponse }, { upsert: true })
        } catch(err) {
            throw new MyError(500, "Error adding new player data to the database", err)
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
            throw new MyError(500, `Error retrieving guild data from database [guildId=${guildId}]`)
        }
        
        if(detailed) {
            let unitsMap = await this.getUnitsMap()
            guildData.roster = []
            guildData.rosterMap = {}

            let playerIds = guildData.member.map(obj => obj.playerId)
            let playerData
            try {
                playerData = await db.collection('player').find({playerId: {$in: playerIds}}, {projection: projection}).toArray()
            } catch(err) {
                throw new MyError(500, `Error retrieving guild member data from database [guildId=${guildId}]`, err)
            }

            playerData.forEach(player => {
                populateRoster(unitsMap, player)
                player.rosterMap = player.rosterUnit.reduce((map, obj) => (map[obj.defId] = obj, map), {})
                guildData.roster.push(player)
                guildData.rosterMap[player.playerId] = player
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
            throw new MyError(500, "Error adding guild data to database", err)
        }

        if(detailed) {
            let playerIds = response.guild.member.map(player => player.playerId)
            await Promise.all(playerIds.map(async id => {
                await this.refreshPlayer({"playerId": id})
            }))
        }
    
        return `Guild [${response.guild.profile.name}] data refreshed`
    }

    async getGuildMemberDiscordRegistrations(guildId) {
        const { db } = await connectToDatabase()

        let guild = await this.getGuildData(guildId)
        let guildPlayerIds = guild.member.map(member => member.playerId)

        let discordRegistrations
        try {
            discordRegistrations = await db.collection('discord_registration').find({playerId: { $in: guildPlayerIds}}).toArray()
        } catch(err) {
            throw new MyError(500, `Error getting discord registrations of guild [guildId=${guildId}]`)
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
            throw new MyError(500, "Error getting discord registrations from database",err)
        }

        return accounts
    }

    async getAccountsByDiscordId(discordId) {
        const { db } = await connectToDatabase()

        let accounts = await this.getDiscordRegistrations(discordId)

        let accountsIds = accounts.map(account => account.playerId).sort((a,b) => a.default ? -1 : b.default ? 1 : 0)

        let accountsData
        try {
            accountsData = await db.collection('player').find({playerId: {$in: accountsIds}}, {projection: {_id: 0, allyCode: 1, playerId: 1, name: 1}}).toArray()
        } catch(err) {
            throw new MyError(500, "Error getting player data from playerIds in the database",err)
        }

        return accountsData
    }

    async getGuildsByDiscordId(discordId) {
        const { db } = await connectToDatabase()

        let accounts = await this.getDiscordRegistrations(discordId)

        let accountsIds = accounts.map(account => account.playerId)

        let guildData
        try {
            guildData = await db.collection('player').find({playerId: {$in: accountsIds}}, {projection: {_id: 0, allyCode: 1, guildName: 1, guildId: 1}}).toArray()
        } catch(err) {
            throw new MyError(500, "Error getting guild data from playerIds in the database", err)
        }
        return guildData
    }

    async getPlayableUnits(filter={}, limit=0, projection={}) {
        const { db } = await connectToDatabase()

        let units
        try {
            units = await db.collection('units').find(filter, { projection: projection}).limit(limit).toArray()
        } catch(err) {
            throw new MyError(500, `Unable to get units from the database`, err)
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
            throw new MyError(500, "Error getting localization for unitsList", err)
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
            throw new MyError(500, `Unable to get roles for guild [${JSON.stringify(filter)}]`, err)
        }
        return roles
    }

    async addRole(role) {
        const { db } = await connectToDatabase()

        try {
            await db.collection('discord_role').insertOne(role)
        } catch (err) {
            throw new MyError(500, `Error adding role to database [${JSON.stringify(role)}]`, err)
        }
        return `Role [${JSON.stringify(role)}] added to the database`
    }

    async removeRole(role) {
        const { db } = await connectToDatabase()

        try {
            await db.collection('discord_role').deleteOne(role)
        } catch(err) {
            throw new MyError(500, `Error removing role [${JSON.stringify(role)}]`, err)
        }
        return `Role [${JSON.stringify(role)}] was removed from the database`
    }

    async getDefaultAccount(discordId) {
        const { db } = await connectToDatabase()

        let discordRegistration
        try {
            discordRegistration = await db.collection('discord_registration').findOne({discord_id: discordId, default: true})
        } catch(err) {
            throw new MyError(500, `Unable to get default account [discordId=${discordId}]`, err)
        }
        return discordRegistration
    }

    async setDefaultAccount(discordId, playerId) {
        const { db } = await connectToDatabase()
        let accounts
        try {
            accounts = await db.collection('discord_registration').find({discord_id: discordId}).toArray()
            await accounts.forEach(async account => {
                await db.collection('discord_registration').updateOne({playerId: account.playerId}, { $set: {default: account.playerId === playerId}})
            })
        } catch(err) {
            throw new MyError(500, `Unable to set default account to [${playerId}]`, err)
        }
        return `Default Account is now set [playerId=${playerId}]`
    }

    async getDefaultGuild(discordId) {
        const { db } = await connectToDatabase()

        let { playerId } = await this.getDefaultAccount(discordId)

        let guildData
        try {
            guildData = await db.collection('player').findOne({playerId: playerId}, {projection: {_id: 0, guildName: 1, guildId: 1}})
        } catch(err) {
            throw new MyError(500, `Unable to get default guild [discordId=${discordId},playerId=${playerId}]`, err)
        }
        return guildData
    }

    async registerUser(payload) {
        const { db } = await connectToDatabase()
        let {discord_id, allyCode, playerId, name} = payload
        
        try {
            let userAccountsCount = await db.collection('discord_registration').count({discord_id: discord_id})
            let defaultAccount = userAccountsCount === 0
            await db.collection('discord_registration').insertOne({discord_id: discord_id, allyCode: allyCode, playerId: playerId, default: defaultAccount})
        } catch(err) {
            throw new MyError(500, `Unable to add registration data to database for user [allyCode=${allyCode}]`, err)
        }
        return `${name} (${allyCode}) has been registered to <@${discord_id}>`
    }

    async unregisterUser(payload) {
        const { db } = await connectToDatabase()

        let { discord_id, playerId } = payload
        //find account to be removed
        let toBeRemoved = await db.collection('discord_registration').findOne({playerId: playerId})
        // find list of all nondefault accounts
        let nonDefaultCount = await db.collection('discord_registration').count({discord_id: discord_id, default: false})

        // return error if problem getting info from db
        if(!toBeRemoved) {
            throw new MyError(500, `Error unregistering, Cannot find user account [playerId=${playerId}]`)
        }

        // cannot remove default accounts while nondefault are registered
        if (toBeRemoved.default && nonDefaultCount) {
            throw new MyError(500, `Cannot remove main account while alt account exist [numAlts=${nonDefaultCount}]`)
        }
        // remove allycode from database
        await db.collection('discord_registration').deleteOne({playerId: playerId})
        return `Account [playerId=${playerId}] has been unregistered from <@${discord_id}>`
    }

    async getServerRegistrations(filter) {
        const { db } = await connectToDatabase()
        let serverRegistrations
        try {
            serverRegistrations = await db.collection('serverRegistration').find(filter).toArray()
        } catch(err) {
            throw new MyError(500, 'Unable to get server registrations', err)
        }
        return serverRegistrations
    }

    async registerServer(serverId, build) {
        const { db } = await connectToDatabase()
        if(build === 'dev') {
            throw new MyError(401, 'You cannot register for this type of server')
        }
        if(build === 'guild') {
            if(!new Array('458371209491644417').includes(serverId)) {
                throw new MyError(401, 'You cannot register for this type of server')
            }
        }
        try {
            await db.collection('serverRegistration').insertOne({serverId: serverId, serverType: build})
        } catch(err) {
            throw new MyError(500, 'Unable to register server in the database', err)
        }
        return `Server [serverId=${serverId}] registered [build=${build}]]`
    }

    async unregisterServer(serverId, build) {
        const { db } = await connectToDatabase()
        try {
            await db.collection('serverRegistration').deleteOne({serverId: serverId, serverType: build})
        } catch(err) {
            throw new MyError(500, 'Unable to unregister server in the database', err)
        }
        return `Server [serverId=${serverId}] unregistered [build=${build}]]`
    }

    async getActiveBuilds(serverId) {
        const { db } = await connectToDatabase()
        let response
        try {
            response = await db.collection('serverRegistration').find({serverId: serverId}).toArray()
        } catch(err) {
            throw new MyError(500, 'Unable to unregister server in the database', err)
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
            throw new MyError(500, "Error retrieving units from database", err)
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
                if(unit.rarity === 7 && unit.obtainableTime === "0") {
                    await db.collection('units').updateOne({ id: unit.id }, { $set: unit }, { upsert: true })
                }
            }))
        } catch(err) {
            throw new MyError(500, "Error adding units to database", err)
        }

        return "Units refreshed"
    }

    //Misc functions

    async getCategoryList() {
        const { db } = await connectToDatabase()
    
        let response
        try {
            response = await db.collection("categories").find({ visible: true }).toArray()
        } catch(err) {
            throw new MyError(500, "Error getting category list from database.", err)
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
                        if(line.match(/^UNIT_.*_NAME(_?V[2-9])?\|.*/g)) {
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
            throw new MyError(500, "Unable to get image from database", err)
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
        throw new MyError(500, "Unable to get unit IDs from the database", err)
    }
    
    try {
        await Promise.all(units.map(async unit => {
            let thumbnail = unit.thumbnailName
            let baseId = unit.baseId
            let image = await getImage(thumbnail)
            await db.collection('images').updateOne({baseId: baseId}, {$set: {thumbnail: thumbnail, image: image, baseId: baseId}}, {upsert: true})
        }))
    } catch(err) {
        console.log(err)
        throw new MyError(500, "Unable to update image data in the database", err)
    }

    return 'Refreshing images complete'
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

export default new DB()