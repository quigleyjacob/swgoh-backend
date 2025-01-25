import { connectToDatabase } from '../../../utils/mongodb.js'
import { handleDBError } from '../../../utils/error.js'
import { ObjectId } from 'mongodb'


class Defense {

    async getDefenses(allyCode) {
        const { db } = await connectToDatabase()
        try {
            return await db.collection('defense').find({allyCode}).toArray()
        } catch(err) {
            throw handleDBError(err, 'defense', 'get')
        }
    }

    async getDefense(defenseId, allyCode) {
        const { db } = await connectToDatabase()
        try {
            return await db.collection('defense').findOne({_id: new ObjectId(defenseId), allyCode})
        } catch(err) {
            throw handleDBError(err, 'defense', 'get')
        }
    }

    async addDefense(allyCode, payload) {
        const { db } = await connectToDatabase()

        let response
        try {
            response = await db.collection('defense').insertOne(payload)
        } catch(err) {
            throw handleDBError(err, 'defense', 'add')
        }
        let id = response.insertedId
        return await db.collection('defense').findOne({_id: new ObjectId(id), allyCode})
    }

    async updateDefense(defenseId, allyCode, payload) {
        const { db } = await connectToDatabase()
        delete payload._id
        let response
        try {
            response = await db.collection('defense').findOneAndUpdate({_id: new ObjectId(defenseId), allyCode},{$set: payload}, {returnDocument: 'after'})
            if(!response.lastErrorObject.updatedExisting) {
                throw new MyError(400, 'Could not find a defense to update.')
            }
        } catch(err) {
            throw handleDBError(err, 'defense', 'update')
        }
        return response.value
    }

    async deleteDefense(defenseId, allyCode) {
        const { db } = await connectToDatabase()
        let response
        try {
            response = await db.collection('defense').deleteOne({_id: new ObjectId(defenseId), allyCode})
            if(response.deletedCount === 0) {
                throw new MyError(400, `No defenses were deleted from the database for [squadId=${squadId}]`)
            }
        } catch(err) {
            throw handleDBError(err, 'defense', 'delete')
        }
        return `Defense [defenseId=${defenseId}] has been deleted.`
    }
}

export default new Defense()