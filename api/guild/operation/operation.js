import Operation from '../../../lib/database/guild/operation.js'
import DB from '../../../lib/database.js'
import { processRequest } from '../../../lib/validation.js'
import { MyError } from '../../../utils/error.js'
import { getIdealPlatoons } from '../../../platoons/platoon.js'

export async function getOperations(req, res) {
    let guildId = req.params.guildId
    let session = req.headers.session
    let projection = {_id: 1, title: 1}
    processRequest(res, async () => {
        if(session && !(await DB.sessionInGuild(session, guildId))) {
            throw new MyError(401, 'Session Id is not present in guild')
        }
        if(!DB.isGuildBuild(guildId)) {
            throw new MyError(401, 'Guild is not registered with the guild build.')
        }
        return Operation.getOperations(guildId, projection)
    })
}

export async function getOperation(req, res) {
    let id = req.params.id
    let session = req.headers.session
    let guildId = req.params.guildId
    processRequest(res, async () => {
        if(session && !(await DB.sessionInGuild(session, guildId))) {
            throw new MyError(401, 'Session Id is not present in guild')
        }
        if(!DB.isGuildBuild(guildId)) {
            throw new MyError(401, 'Guild is not registered with the guild build.')
        }
        return Operation.getOperation(id, guildId)
    })
}

export async function addOperation(req, res) {
    let guildId = req.params.guildId
    let session = req.headers.session
    let payload = {...req.body, guildId}
    processRequest(res, async () => {
        if(session && !(await DB.sessionIsGuildOfficer(session, guildId))) {
            throw new MyError(401, 'Session Id is not a guild officer')
        }
        if(!DB.isGuildBuild(guildId)) {
            throw new MyError(401, 'Guild is not registered with the guild build.')
        }
        return Operation.addOperation(payload)
    })
}

export async function updateOperation(req, res) {
    let id = req.params.id
    let guildId = req.params.guildId
    let session = req.headers.session
    let payload = {...req.body, guildId}
    processRequest(res, async () => {
        if(session && !(await DB.sessionIsGuildOfficer(session, guildId))) {
            throw new MyError(401, 'Session Id is not a guild officer')
        }
        if(!DB.isGuildBuild(guildId)) {
            throw new MyError(401, 'Guild is not registered with the guild build.')
        }
        return Operation.updateOperation(id, guildId, payload)
    })
}

export async function deleteOperation(req, res) {
    let id = req.params.id
    let guildId = req.params.guildId
    let session = req.headers.session
    processRequest(res, async () => {
        if(session && !(await DB.sessionIsGuildOfficer(session, guildId))) {
            throw new MyError(401, 'Session Id is not a guild officer')
        }
        if(!DB.isGuildBuild(guildId)) {
            throw new MyError(401, 'Guild is not registered with the guild build.')
        }
        return Operation.deleteOperation(id, guildId)
    })
}

export async function computeIdealPlatoons(req, res) {
    let guildId = req.params.guildId
    let session = req.headers.session
    let payload = {...req.body, guildId}
    processRequest(res, async () => {
        if(session && !(await DB.sessionIsGuildOfficer(session, guildId))) {
            throw new MyError(401, 'Session Id is not a guild officer')
        }
        if(!DB.isGuildBuild(guildId)) {
            throw new MyError(401, 'Guild is not registered with the guild build.')
        }
        return getIdealPlatoons(payload)
})
}