import { connectToDatabase } from "../utils/mongodb.js"
import { player as _player } from '../utils/payloads.js'
import projections from '../utils/projections.js'
import { getImage } from './hu.js'
import Comlink from './comlink.js'
import decompress from 'decompress'

export async function getCategoryList() {
    const { db } = await connectToDatabase()

    let categories = await db.collection("categories").find({ visible: true })

    let data = await categories.toArray()

    return JSON.parse(JSON.stringify(data))
}
export async function getPlayerData(allyCode, update, projectionName) {
    const { db } = await connectToDatabase()
    if (update) {
        let res = await refreshPlayer({"allyCode": allyCode})
        if(!res.success) {
            return res
        }
    }
    let player = await db.collection('player').findOne({ allyCode: allyCode }, {projection: projections[projectionName]})
    if (!player) {
        return await getPlayerData(allyCode, true)
    }
    return {success: true, response: player}
}

export async function getGuildData(guildId, update) {
    const { db } = await connectToDatabase()
    const guildData = await db.collection('guild').findOne({id: guildId})
    return guildData
}

export async function getDetailedGuildData(guildId, update, projectionName) {
    const { db } = await connectToDatabase()
    let unitsMap = await getUnitsMap()
    const guildData = await db.collection('guild').findOne({id: guildId})
    const projection = projections[projectionName]
    if(!guildData) throw {message: `Guild with id ${guildId} not found with the provided id`}
    const playerIds = guildData.member.map(obj => obj.playerId)
    const playerData = await db.collection('player').find({playerId: {$in: playerIds}}, {projection: projection}).toArray()
    guildData.roster = []
    guildData.rosterMap = {}
    playerData.forEach(player => {
        populateRoster(unitsMap, player)
        player.rosterMap = player.rosterUnit.reduce((map, obj) => (map[obj.defId] = obj, map), {})
        guildData.roster.push(player)
        guildData.rosterMap[player.allyCode] = player
    })
    return {success: true, response: guildData}
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

  export async function getPlatoons(tb, ls_phase, mix_phase, ds_phase) {
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

export async function refreshGuild(allyCode) {
    const { db } = await connectToDatabase()
    let {success, response} = await Comlink.getGuild(allyCode)
    if(!success) {
        return {success: false, response: response}
    }
    console.log(response.guild.profile.name)
    let guild = response.guild

    db.collection('guild').updateOne({'id': guild.profile.id}, {$set: guild}, {upsert: true})

    let playerIds = guild.member.map(player => player.playerId)
    await Promise.all(playerIds.map(async id => {
        await refreshPlayer({"playerId": id})
    }))
    .catch(err => console.error(err))

    return {success: true, response: `Guild [${guild.profile.name}] updated`}
}

export async function refreshPlayer(payload) {
    const { db } = await connectToDatabase()
    let {success, response} = await Comlink.getPlayer(payload)
    let allyCode = response.allyCode
    if(success) {
        await db.collection('player').updateOne({ allyCode: allyCode }, { $set: response }, { upsert: true })
        return {success: true, response: `Player [${JSON.stringify(payload)}] has been updated`}
    } else {
        return {success: false, response: JSON.parse(response)}
    }
}

export async function refreshUnits() {
    const { db } = await connectToDatabase()
    let units = await Comlink.getUnits()
    await Promise.all(units.map(async unit => {
        await db.collection('units').updateOne({ id: unit.id }, { $set: unit }, { upsert: true })
    }))
    return "Units refreshed"
}

export async function getUnits() {
    const { db } = await connectToDatabase()
    let results = await db.collection('units').aggregate([
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
    return results
}

export async function getUnitImage(baseId) {
    const { db } = await connectToDatabase()
    return await db.collection('images').findOne({baseId: baseId})
}

export async function getUnitsMap() {
    return (await getUnits()).reduce((map, obj) => (map[obj.baseId] = obj, map), {})
}

export async function refreshLocalization() {
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
    return 'Localizations Updated'
}

export async function refreshImages() {
    const { db } = await connectToDatabase()
    // get all thumbnails for each unit
    let units = await db.collection('units').find({}, {projection: {"thumbnailName": 1, 'baseId': 1}}).toArray()

    await Promise.all(units.map(async unit => {
        let thumbnail = unit.thumbnailName
        let baseId = unit.baseId
        await getImage(thumbnail)
        .then(async response => {
            await db.collection('images').updateOne({baseId: baseId}, {$set: {thumbnail: thumbnail, image: response, baseId: baseId}}, {upsert: true})
        })
        .catch(err => {
            console.log(err)
        })
        
    }))
    return 'Refreshing images complete'
}