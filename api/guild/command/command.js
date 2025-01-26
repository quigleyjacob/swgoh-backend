import Command from '../../../lib/database/guild/command.js'
import DB from '../../../lib/database.js'
import Session from '../../../lib/database/session.js'
import { processRequest } from '../../../lib/validation.js'
import { MyError } from '../../../utils/error.js'

export async function getCommands(req, res) {
    let guildId = req.params.guildId
    let session = req.headers.session
    let type = req.query.type
    let projection = {_id: 1, title: 1}
    processRequest(res, async () => {
        if(session && !(await Session.sessionInGuild(session, guildId))) {
            throw new MyError(401, 'Session Id is not present in guild')
        }
        if(!DB.isGuildBuild(guildId)) {
            throw new MyError(401, 'Guild is not registered with the guild build.')
        }
        return Command.getCommands(guildId, type, projection)
    })
}

export async function getCommand(req, res) {
    let commandId = req.params.id
    let projection = {title: 1, description: 1, type: 1}
    let session = req.headers.session
    let guildId = req.params.guildId
    processRequest(res, async () => {
        if(session && !(await Session.sessionInGuild(session, guildId))) {
            throw new MyError(401, 'Session Id is not present in guild')
        }
        if(!DB.isGuildBuild(guildId)) {
            throw new MyError(401, 'Guild is not registered with the guild build.')
        }
        return Command.getCommand(commandId, guildId, projection)
    })
}

export async function addCommand(req, res) {
    let guildId = req.params.guildId
    let session = req.headers.session
    let payload = {...req.body, guildId}
    processRequest(res, async () => {
        if(session && !(await Session.sessionIsGuildOfficer(session, guildId))) {
            throw new MyError(401, 'Session Id is not a guild officer')
        }
        if(!DB.isGuildBuild(guildId)) {
            throw new MyError(401, 'Guild is not registered with the guild build.')
        }
        return Command.addCommand(payload)
    })
}

export async function deleteCommand(req, res) {
    let id = req.params.id
    let guildId = req.params.guildId
    let session = req.headers.session
    
    processRequest(res, async () => {
        if(session && !(await Session.sessionIsGuildOfficer(session, guildId))) {
            throw new MyError(401, 'Session Id is not a guild officer')
        }
        if(!DB.isGuildBuild(guildId)) {
            throw new MyError(401, 'Guild is not registered with the guild build.')
        }
        return Command.deleteCommand(id, guildId)
    })
}

export async function updateCommand(req, res) {
    let id = req.params.id
    let guildId = req.params.guildId
    let session = req.headers.session
    let payload = {...req.body, guildId}
    processRequest(res, async () => {
        if(session && !(await Session.sessionIsGuildOfficer(session, guildId))) {
            throw new MyError(401, 'Session Id is not a guild officer')
        }
        if(!DB.isGuildBuild(guildId)) {
            throw new MyError(401, 'Guild is not registered with the guild build.')
        }
        return Command.updateCommand(id, guildId, payload)
    })
}