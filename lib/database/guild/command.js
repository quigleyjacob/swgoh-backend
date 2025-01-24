import { connectToDatabase } from '../../../utils/mongodb.js';
import { handleDBError, MyError } from '../../../utils/error.js';
import { ObjectId } from 'mongodb';

class Command {
    async getCommands(guildId, type, projection) {
        const { db } = await connectToDatabase()
        let response
        try {
            response = await db.collection('command').find({guildId: guildId, type: type}, {projection: projection, ignoreUndefined: true}).toArray()
        } catch(err) {
            throw handleDBError(err, 'command', 'read')
        }
        return response
    }

    async getCommand(commandId, guildId, projection) {
        const { db } = await connectToDatabase()
        let response
        try {
            response = await db.collection('command').findOne({_id: new ObjectId(commandId), guildId}, {projection: projection})
        } catch(err) {
            throw handleDBError(err, 'command', 'read')
        }
        return response
    }

    async addCommand(payload) {
        const { db } = await connectToDatabase()
        let response
        try {
            response = await db.collection('command').insertOne(payload)
        } catch(err) {
            throw handleDBError(err, 'command', 'create')
        }
        let id = response.insertedId
        return await db.collection('command').findOne({_id: new ObjectId(id)})
    }

    async updateCommand(id, guildId, payload) {
        const { db } = await connectToDatabase()
        let response
        try {
            response = await db.collection('command').findOneAndUpdate({_id: ObjectId(id), guildId}, {$set: payload}, {returnDocument: 'after'})
            if(!response.lastErrorObject.updatedExisting) {
                throw new MyError(400, 'Could not find a command to update.')
            }
        } catch(err) {
            throw handleDBError(err, 'command', 'update')
        }
        return response.value
    }

    async deleteCommand(commandId, guildId) {
        const { db } = await connectToDatabase()

        let response
        try {
            response = await db.collection('command').deleteOne({_id: new ObjectId(commandId), guildId})
            if(response.deletedCount === 0) {
                throw new MyError(400, 'Could not find a command to delete.')
            }
        } catch(err) {
            throw handleDBError(err, "command", 'delete')
        }
        return `Command [id=${commandId}] successfully deleted`
    }
}

export default new Command()