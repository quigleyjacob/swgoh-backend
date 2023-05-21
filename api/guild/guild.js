import DB from '../../lib/database.js'
import { MyError } from '../../lib/error.js'
import { processRequest } from '../../lib/validation.js'

export async function getGuildData(req, res) {
    let refresh = req.body.refresh ? true : false
    let detailed = req.body.detailed ? true : false
    let guildId = req.body.guildId
    let projection = req.body.projection || {}
    processRequest(res, () => DB.getGuildData(guildId, refresh, detailed, projection))
}

export async function getCommands(req, res) {
    let guildId = req.body.guildId
    let session = req.body.session
    let type = req.body.type
    let projection = req.body.projection || {}
    processRequest(res, async () => {
        if(session && !(await DB.sessionInGuild(session, guildId))) {
            throw new MyError(401, 'Session Id is not present in guild')
        }
        if(!DB.isGuildBuild(guildId)) {
            throw new MyError(401, 'Guild is not registered with the guild build.')
        }
        return DB.getCommands(guildId, type, projection)
    })
}

export async function getCommand(req, res) {
    let commandId = req.body.commandId
    let projection = req.body.projection || {}
    let session = req.body.session
    let guildId = req.body.guildId
    processRequest(res, async () => {
        if(session && !(await DB.sessionInGuild(session, guildId))) {
            throw new MyError(401, 'Session Id is not present in guild')
        }
        if(!DB.isGuildBuild(guildId)) {
            throw new MyError(401, 'Guild is not registered with the guild build.')
        }
        return DB.getCommand(commandId, projection)
    })
}

export async function addCommand(req, res) {
    let guildId = req.body.guildId
    let session = req.body.session
    let type = req.body.type
    let commandId = req.body.id
    let title = req.body.title
    let description = req.body.description
    processRequest(res, async () => {
        if(session && !(await DB.sessionIsGuildOfficer(session, guildId))) {
            throw new MyError(401, 'Session Id is not a guild officer')
        }
        if(!DB.isGuildBuild(guildId)) {
            throw new MyError(401, 'Guild is not registered with the guild build.')
        }
        return DB.addCommand(commandId, type, title, description, guildId)
    })
}

export async function deleteCommand(req, res) {
    let guildId = req.body.guildId
    let session = req.body.session
    let commandId = req.body.commandId
    processRequest(res, async () => {
        if(session && !(await DB.sessionIsGuildOfficer(session, guildId))) {
            throw new MyError(401, 'Session Id is not a guild officer')
        }
        if(!DB.isGuildBuild(guildId)) {
            throw new MyError(401, 'Guild is not registered with the guild build.')
        }
        return DB.deleteCommand(commandId)
    })
}

export async function getOperations(req, res) {
    let guildId = req.body.guildId
    let session = req.body.session
    let projection = req.body.projection || {}
    processRequest(res, async () => {
        if(session && !(await DB.sessionInGuild(session, guildId))) {
            throw new MyError(401, 'Session Id is not present in guild')
        }
        if(!DB.isGuildBuild(guildId)) {
            throw new MyError(401, 'Guild is not registered with the guild build.')
        }
        return DB.getOperations(guildId, projection)
    })
}

export async function getOperation(req, res) {
    let operationId = req.body.operationId
    let projection = req.body.projection || {}
    let session = req.body.session
    let guildId = req.body.guildId
    processRequest(res, async () => {
        if(session && !(await DB.sessionInGuild(session, guildId))) {
            throw new MyError(401, 'Session Id is not present in guild')
        }
        if(!DB.isGuildBuild(guildId)) {
            throw new MyError(401, 'Guild is not registered with the guild build.')
        }
        return DB.getOperation(operationId, projection)
    })
}

export async function addOperation(req, res) {
    let guildId = req.body.guildId
    let session = req.body.session
    let operationId = req.body.operationId
    let operation = req.body.operation
    processRequest(res, async () => {
        if(session && !(await DB.sessionIsGuildOfficer(session, guildId))) {
            throw new MyError(401, 'Session Id is not a guild officer')
        }
        if(!DB.isGuildBuild(guildId)) {
            throw new MyError(401, 'Guild is not registered with the guild build.')
        }
        return DB.addOperation(operation, operationId, guildId)
    })
}

export async function deleteOperation(req, res) {
    let guildId = req.body.guildId
    let session = req.body.session
    let operationId = req.body.operationId
    processRequest(res, async () => {
        if(session && !(await DB.sessionIsGuildOfficer(session, guildId))) {
            throw new MyError(401, 'Session Id is not a guild officer')
        }
        if(!DB.isGuildBuild(guildId)) {
            throw new MyError(401, 'Guild is not registered with the guild build.')
        }
        return DB.deleteOperation(operationId)
    })
}

export async function isGuildBuild(req, res) {
    let guildId = req.body.guildId
    let session = req.body.session
    processRequest(res, async () => {
        if(session && !(await DB.sessionInGuild(session, guildId))) {
            throw new MyError(401, 'Session Id is not a guild officer')
        } 
        return DB.isGuildBuild(guildId)
    })
}