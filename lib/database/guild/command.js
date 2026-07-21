import { connectToDatabase } from '../../../utils/mongodb.js';
import { handleDBError, MyError } from '../../../utils/error.js';
import { ObjectId } from 'mongodb';
import Mhann from '../../mhann.js';

class Command {
    async getCommands(guildId, type, projection) {
        const { db } = await connectToDatabase()
        let response
        try {
            let query = {type, $or: [{guildId}, {public: true}]}
            response = await db.collection('command').find(query, {projection: projection, ignoreUndefined: true}).sort({public: 1}).toArray()
        } catch(err) {
            throw handleDBError(err, 'command', 'read')
        }
        return response
    }

    async getCommand(commandId, guildId, projection = {}) {
        const { db } = await connectToDatabase()
        let response
        try {
            response = await db.collection('command').findOne({_id: new ObjectId(commandId), $or: [{public: true}, {guildId}]}, {projection: projection})
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
            response = await db.collection('command').findOneAndUpdate({_id: new ObjectId(id), guildId}, {$set: payload}, {returnDocument: 'after'})
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

    async deployCommands(allyCode, discordId, command) {
        let response = await Mhann.deployCommands(allyCode, discordId, command)
        let title = command.title || 'Custom command'
        let success = response.every(p => p.code === 0)
        let message
        if(success) {
            message = `All commands for command=${title} succesfully pushed to game using allycode=${allyCode}`
        } else {
            let errors = response
                .filter(p => p.code !== 0)
                .map(p => `- ${p.zoneManagementRequest.zoneId}: ${p.message}`)
                .join('\n') 
            message = `Some commands for command=${title} pushed to game using allycode=${allyCode}.\n\nUnable to push the following commands:\n` + errors
        }
        return {success, message}
    }
}

export default new Command()