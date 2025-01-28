import { connectToDatabase } from '../../../utils/mongodb.js'
import { handleDBError } from '../../../utils/error.js'
import { ObjectId } from 'mongodb'

class Squad {
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

    async deleteSquad(squadId, allyCode) {
        const { db } = await connectToDatabase()
        try {
            let response = await db.collection('squad').deleteOne({_id: new ObjectId(squadId), allyCode})
            if(response.deletedCount === 0) {
                throw new MyError(400, `No squads were deleted from the database for [squadId=${squadId}]`)
            }
        } catch(err) {
            throw handleDBError(err, 'squad', 'delete')
        }
        return `Squad [squadId=${squadId}] has been deleted.`
    }
}

export default new Squad()