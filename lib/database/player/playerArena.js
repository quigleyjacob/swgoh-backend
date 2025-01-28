import { connectToDatabase } from '../../../utils/mongodb.js'
import { handleDBError, MyError } from '../../../utils/error.js'
import Refresh from '../refresh.js'
import { defaultPlayerArenaProjection } from '../../../utils/projections.js'

class PlayerArena {
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
}

export default new PlayerArena()