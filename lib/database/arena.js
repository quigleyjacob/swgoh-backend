import { connectToDatabase } from "../../utils/mongodb.js"
import DB from '../database.js'
import Refresh from "./refresh.js"

class Arena {

    async addArena(payload) {
        let { allyCode } = payload
        const { db } = await connectToDatabase()

        try {
            await db.collection('arena').updateOne({ allyCode }, { $set: payload }, { upsert: true })
            await Refresh.refreshPlayerArena({allyCode})
        } catch(err) {
            throw handleDBError(err, 'arena', 'set')
        }

    }

    async removeArena(allyCode) {
        const { db } = await connectToDatabase()

        try {
            await db.collection('arena').deleteOne({allyCode})
            await db.collection('playerArena').deleteOne({allyCode})
        } catch(err) {
            throw handleDBError(err, "arena/playerArena", 'remove')
        }
    }

    async getArena(allyCode) {
        const { db } = await connectToDatabase()

        let arena, playerArena
        try {
            arena = await db.collection('arena').findOne({allyCode})
            playerArena = await db.collection('playerArena').findOne({allyCode})
        } catch(err) {
            throw handleDBError(err, 'arena/playerArena', 'get')
        }
        return {
            arena: arena,
            playerArena: playerArena
        }
    }

    async checkArenas() {
        const { db } = await connectToDatabase()

        let arenaList = await db.collection('arena').find().toArray()

        let allyCodeArray = arenaList.map(({allyCode}) => allyCode)

        let cachedArena = await DB.getPlayerArenas(allyCodeArray)
        let currentArena = await Refresh.refreshPlayerArenas(allyCodeArray)

        return arenaList.map((arena, index) => {
            return {
                arena,
                oldPlayerArena: cachedArena[index],
                newPlayerArena: currentArena[index]
            }
        })
    }

}

export default new Arena()