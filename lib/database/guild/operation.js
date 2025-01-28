import { connectToDatabase } from "../../../utils/mongodb.js"
import { handleDBError } from "../../../utils/error.js"
import { ObjectId } from "mongodb"
import { MyError } from "../../../utils/error.js"

class Operation {
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

    async getOperation(operationId, guildId) {
        const { db } = await connectToDatabase()
        let response
        try {
            response = await db.collection('operation').findOne({_id: new ObjectId(operationId), guildId})
        } catch(err) {
            throw new handleDBError(err, 'operation', 'get')
        }
        return response
    }

    async addOperation(payload) {
        const { db } = await connectToDatabase()
        let response
        try {
            response = await db.collection('operation').insertOne(payload)
        } catch(err) {
            throw handleDBError(err, 'operation', 'add')
        }
        let id = response.insertedId
        return await db.collection('operation').findOne({_id: new ObjectId(id)})
    }

    async updateOperation(operationId, guildId, payload) {
        const { db } = await connectToDatabase()
        let response
        try {
            response = await db.collection('operation').findOneAndUpdate({_id: new ObjectId(operationId), guildId}, {$set: payload}, {returnDocument: 'after'})
            if(!response.lastErrorObject.updatedExisting) {
                throw new MyError(400, 'Could not find an operation to update.')
            }
        } catch(err) {
            throw handleDBError(err, 'operation', 'update')
        }
        return response.value
    }

    async deleteOperation(operationId, guildId) {
        const { db } = await connectToDatabase()
        let response
        try {
            response = await db.collection('operation').deleteOne({_id: new ObjectId(operationId), guildId})
            if(response.deletedCount === 0) {
                throw new MyError(400, `No operations were deleted from the database for [operationId=${operationId}]`)
            }
        } catch(err) {
            throw handleDBError(err, "operation", 'delete')
        }
        return `Operation [id=${operationId}] successfully deleted.`
    }
}

export default new Operation()