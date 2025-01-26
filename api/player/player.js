import DB from '../../lib/database.js'
import Session from '../../lib/database/session.js'
import { MyError } from '../../utils/error.js'
import { processRequest } from '../../lib/validation.js'
import Mhann from '../../lib/mhann.js'
import { defaultPlayerArenaProjection, defaultPlayerProjection } from '../../utils/projections.js'

export async function getPlayer(req, res) {
    let refresh = req.body.refresh ? true : false
    let projection = req.body.projection || defaultPlayerProjection
    let payload = req.body.payload
    processRequest(res, () => DB.getPlayer(payload, refresh, projection))
}

export async function getAccounts(req, res) {
    let session = req.headers.session
    let discordId = (await Session.sessionToDiscord(session)).id
    processRequest(res, () => DB.getAccountsByDiscordId(discordId))
}

export async function getPlayerArena(req, res) {
    let allyCodeArray = req.body.allyCodeArray
    let projection = req.body.projection || defaultPlayerArenaProjection
    processRequest(res, () => DB.getPlayerArenas(allyCodeArray, projection))
}

export async function getDatacronNames(req, res) {
    let session = req.body.session
    let allyCode = req.body.allyCode

    processRequest(res, async () => {
        if(session && !(await Session.sessionIsPlayer(session, allyCode))) {
            throw new MyError(401, 'Session Id is not player')
        }
        return DB.getDatacronNames(allyCode)
    })
}

export async function updateDatacronNames(req, res) {
    let body = req.body.body
    let allyCode = req.body.body.allyCode
    let session = req.body.session
    processRequest(res, async () => {
        if(session && !(await Session.sessionIsPlayer(session, allyCode))) {
            throw new MyError(401, 'Session Id is not player')
        }
        return DB.updateDatacronNames(body)
    })
}

export async function getAuthStatus(req, res) {
    let session = req.headers.session
    let allyCode = req.headers.allycode
    processRequest(res, async () => {
        if(session && !(await Session.sessionIsPlayer(session, allyCode))) {
            throw new MyError(401, 'Session Id is not player')
        }
        return Mhann.getUserAuthStatus(allyCode)
    })
}