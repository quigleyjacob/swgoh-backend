import { connectToDatabase } from "../../../utils/mongodb.js"
import { handleDBError } from "../../../utils/error.js"
import { ObjectId } from "mongodb"
import { MyError } from "../../../utils/error.js"
import Player from "./player.js"
import PlayerArena from "./playerArena.js"
import Mhann from "../../mhann.js"
import { getCurrentGAC } from "../../hu.js"
import { formatHotUtilsGacBoard, formatMhannGacBoard } from "../../../utils/gac.js"
import { validateResponse } from "../../validation.js"
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from "url"

class Gac {

    async getGacs(allyCode, projection) {
        const { db } = await connectToDatabase()
        let response
        try {
            response = await db.collection('gac').find({ 'player.allyCode': allyCode }, { projection }).sort({ time: -1 }).limit(10).toArray()
        } catch (err) {
            handleDBError(err, 'gac', 'get')
        }
        return response
    }

    async getGac(id, allyCode) {
        const { db } = await connectToDatabase()
        let response
        try {
            response = await db.collection('gac').findOne({ _id: new ObjectId(id), 'player.allyCode': allyCode })
        } catch (err) {
            handleDBError(err, 'gac', 'get')
        }
        return response
    }

    async addGac(allyCode, payload) {
        const { db } = await connectToDatabase()

        let response
        try {
            response = await db.collection('gac').insertOne(payload)
        } catch (err) {
            throw handleDBError(err, 'gac', 'add')
        }
        let id = response.insertedId
        return await db.collection('gac').findOne({ _id: new ObjectId(id), 'player.allyCode': allyCode })
    }

    async updateGac(gacId, allyCode, payload) {
        const { db } = await connectToDatabase()
        delete payload._id
        let response
        try {
            response = await db.collection('gac').findOneAndUpdate({ _id: new ObjectId(gacId), 'player.allyCode': allyCode }, { $set: payload }, { returnDocument: 'after' })
            if (!response.lastErrorObject.updatedExisting) {
                throw new MyError(400, 'Could not find a GAC to update.')
            }
        } catch (err) {
            throw handleDBError(err, 'gac', 'update')
        }
        return response.value
    }

    async deleteGac(gacId, allyCode) {
        const { db } = await connectToDatabase()
        let response
        try {
            response = await db.collection('gac').deleteOne({ _id: new ObjectId(gacId), 'player.allyCode': allyCode })
            if (response.deletedCount === 0) {
                throw new MyError(400, `No defenses were deleted from the database for [gacId=${gacId}]`)
            }
        } catch (err) {
            throw handleDBError(err, 'gac', 'delete')
        }
        return `Gac [gacId=${gacId}] has been deleted.`
    }

    async getCurrentGACBoard(session, allyCode) {
        let gameConnection = await Player.getGameConnection(session, allyCode)
        try {
            if (gameConnection) {
                let sessionId = gameConnection.sessionId
                let gacBoard = await getCurrentGAC(sessionId)
                return formatHotUtilsGacBoard(gacBoard, allyCode)
            } else {
                let gacBoard = await Mhann.getCurrentGACBoard(allyCode)
                return formatMhannGacBoard(gacBoard, allyCode)
            }
        } catch (err) {
            throw err
        }
    }

    async getLatestBracketResults(allyCode) {
        // const __filename = fileURLToPath(import.meta.url);
        // const __dirname = path.dirname(__filename);
        // return JSON.parse(fs.readFileSync(path.resolve(__dirname, './bracket.json')))
        let playerId = await PlayerArena.getPlayerIdFromAllyCode(allyCode)

        let json = await fetch(`https://gahistory.c3po.wtf/player/${playerId}.json`, { method: 'GET' })
        return validateResponse(json, 'Unable to get latest GAC Bracket results')
    }


    async getGacHistoryResults(allyCode, payload) {
        const { db } = await connectToDatabase()

        let keyToPath = {
            "allyUnits": "battleLog.attackTeam.squad.baseId",
            "enemyUnits": "battleLog.defenseTeam.squad.baseId",
            "result": "battleLog.result",
            "mode": "mode",
            "opponentAllyCode": 'opponent.allyCode'
        }

        let initialMatch = Object.keys(payload).reduce((obj, key) => {
            let value = payload[key]
            let path = keyToPath[key] || key
            if(Array.isArray(value)) {
                obj[path] = { $in: value }
            } else {
                obj[path] = value
            }
            return obj
        }, {"player.allyCode": allyCode})

        let matches = Object.keys(payload)
        .filter(key => !['opponentAllyCode','mode'].includes(key))
        .map(key => {
            let value = payload[key]
            let path = keyToPath[key] || key
            if(Array.isArray(value)) {
                return { $match: {[path]: { $in: value } } }
            } else {
                return { $match: {[path]: value}}
            }
        })

        let aggregate = [
            {
                $match: initialMatch
            },
            {
                $unwind: {
                    path: "$battleLog"
                }
            },
            {
                $project: {
                    battleLog: 1,
                    time: 1
                }
            },
            ...matches
        ]

        return await db.collection('gac').aggregate(aggregate).toArray()
    }
}

export default new Gac()