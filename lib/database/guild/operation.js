import { connectToDatabase } from "../../../utils/mongodb.js"
import { handleDBError } from "../../../utils/error.js"
import { ObjectId } from "mongodb"
import { MyError } from "../../../utils/error.js"
import Mhann from '../../../lib/mhann.js'

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

    async addComputedOperation(payload, platoon) {
        const { db } = await connectToDatabase()
        let response
        try {
            let now = new Date()
            response = await db.collection('operation-computed').insertOne({time: now, request: payload, response: platoon})
        } catch(err) {
            throw handleDBError(err, 'operation-compute', 'add')
        }
        return response.insertedId.toString()
    }

    async getOperationComputedByMessage(guildId, discordGuildId, channelId, messageId) {
        const { db } = await connectToDatabase()
        let response
        try {
            response = await db.collection('operation-computed').findOne({
                'request.guildId': guildId,
                messages: {
                    $elemMatch: {
                        guildId: discordGuildId,
                        channelId: channelId,
                        messageId: messageId
                    }
                }
            })
        } catch(err) {
            throw handleDBError(err, 'operation-compute', 'get')
        }
        return response
    }

    async patchOperationComputed(id, guildId, messages) {
        const { db } = await connectToDatabase()
        let response
        try {
            response = await db.collection('operation-computed').findOneAndUpdate({_id: new ObjectId(id), 'request.guildId': guildId}, {$set: {messages}})
        } catch(err) {
            throw handleDBError(err, 'operation-compute', 'patch')
        }
        return 'messageId patched to computed operation'
    }

    async patchOperationComputedDirectMessages(id, guildId, directMessages) {
        const { db } = await connectToDatabase()
        let response
        try {
            response = await db.collection('operation-computed').findOneAndUpdate({_id: new ObjectId(id), 'request.guildId': guildId}, {$set: {directMessages}})
        } catch(err) {
            throw handleDBError(err, 'operation-compute', 'patch')
        }
        return 'direct message references patched to computed operation'
    }

    async deployOperationsByDirectMessage(messageId, channelId, userDiscordId) {
        const { db } = await connectToDatabase()
        let response
        try {
            response = await db.collection('operation-computed').findOne({
                'directMessages': {
                    $elemMatch: {
                        id: messageId,
                        channelId: channelId
                    }
                }
            })
            if(!response) {
                throw new MyError(404, 'Could not find operation for this direct message')
            }
        } catch(err) {
            if(err.code) {
                throw err
            }
            throw handleDBError(err, 'operation-compute', 'deploy')
        }
        const directMessage = response.directMessages.find(dm => dm.id === messageId && dm.channelId === channelId)
        const allyCode = directMessage.allyCode
        const optimalPlacement = response.response.optimalPlacement
        const playerPlacements = optimalPlacement.find(p => p.allyCode === allyCode)
        if(!playerPlacements) {
            throw new MyError(404, 'Could not find placements for this player')
        }

        const deploymentResult = await Mhann.deployOperations(allyCode, userDiscordId, playerPlacements.placements)

        let success = deploymentResult.every(p => p.code === 0)
        let message
        if(!success) {
            let errorMessages = deploymentResult.filter(p => p.code !== 0).map(p => `${p.deployRequest.baseId}: ${p.message}`)
            message = `The following could not be deployed for ${allyCode}:\n${errorMessages.join('\n')}`
        } else {
            message = `Operations deployed for ${playerPlacements.name}`
        }

        return {
            message,
            success,
            allyCode: allyCode,
            userDiscordId: userDiscordId,
            placements: playerPlacements.placements
        }
    }
}

export default new Operation()