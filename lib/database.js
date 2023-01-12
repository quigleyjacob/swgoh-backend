import { connectToDatabase } from "../utils/mongodb.js"
import { player as _player } from '../utils/payloads.js'
import projections from '../utils/projections.js'
import Comlink from './comlink.js'
import decompress from 'decompress'
import { MyError } from "./error.js"

class DB {

    constructor() {
        this.S3_URL = ''
    }

    //Player functions
    async getPlayerData(allyCode, refresh, projectionName) {
        const { db } = await connectToDatabase()
        if (refresh) {
            await this.refreshPlayer({"allyCode": allyCode})
        }
        let response = await db.collection('player').findOne({ allyCode: allyCode }, {projection: projections[projectionName]})
        if (!response) {
            throw new MyError(404, `Player [allyCode=${allyCode}] not found in the database`, response)
        }
        return response
    }
    async refreshPlayer(payload) {
        const { db } = await connectToDatabase()
        let comlinkResponse = await Comlink.getPlayer(payload)
        let allyCode = comlinkResponse.allyCode
        try {
            await db.collection('player').updateOne({ allyCode: allyCode }, { $set: comlinkResponse }, { upsert: true })
        } catch(err) {
            throw new MyError(500, "Error adding new player data to the database", err)
        }
        return `Player data [allyCode=${allyCode}] refreshed`
    }

    //Guild functions
    async getGuildData(guildId, refresh=false, detailed=false, projectionName='') {
        if(detailed && !projectionName) { // trying to get all data for all guild members
            throw new MyError(403, "You absolutely will brick this system if you try this. Include a projection if you would like detailed guild member information.", Error())
        }
        const { db } = await connectToDatabase()
        if(refresh) {
            await this.refreshGuild(guildId, detailed)
        }
        let guildData
        try {
            guildData = await db.collection('guild').findOne({id: guildId})
        } catch(err) {
            throw new MyError(500, "Error retrieving guild data from database", err)
        }
        
        if(detailed) {
            let unitsMap = await this.getUnitsMap()
            let projection = projections[projectionName]
            guildData.roster = []
            guildData.rosterMap = {}

            let playerIds = guildData.member.map(obj => obj.playerId)
            let playerData
            try {
                playerData = await db.collection('player').find({playerId: {$in: playerIds}}, {projection: projection}).toArray()
            } catch(err) {
                throw new MyError(500, "Error retrieving guild member data from database", err)
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
                await db.collection('units').updateOne({ id: unit.id }, { $set: unit }, { upsert: true })
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
            throw new MyError(500, "Error getting category list from database.")
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
        units = await db.collection('units').find({}, {projection: {"thumbnailName": 1, 'baseId': 1}}).toArray()
    } catch(err) {
        throw new MyError(500, "Unable to get unit IDs from the database")
    }
    
    try {
        await Promise.all(units.map(async unit => {
            let thumbnail = unit.thumbnailName
            let baseId = unit.baseId
            let image = await this.getUnitImage(baseId)
            await db.collection('images').updateOne({baseId: baseId}, {$set: {thumbnail: thumbnail, image: image, baseId: baseId}}, {upsert: true})
        }))
    } catch(err) {
        throw new Error(500, "Unable to update image data in the database")
    }

    return 'Refreshing images complete'
}

}

async function populateRoster(unitsMap, player) {
    player.rosterUnit.forEach(unit => {
        let match = new RegExp("^([A-Z0-9_]+):[A-Z_]+$", "g").exec(unit.definitionId)
        let defId = match[1]
        unit.defId = defId
        let unitDetails = unitsMap[defId]
        unit.nameKey = unitDetails["nameKey"]["value"]
        unit.combatType = unitDetails["combatType"]
    })
}

export default new DB()