import DB from '../../lib/database.js'
import { MyError } from '../../utils/error.js'
import { processRequest } from '../../lib/validation.js'
import Mhann from '../../lib/mhann.js'
import { defaultPlayerProjection } from '../../utils/projections.js'

export async function getPlayer(req, res)  {
    let refresh = req.body.refresh ? true : false
    let projection = req.body.projection || defaultPlayerProjection
    let payload = req.body.payload
    processRequest(res, () => DB.getPlayer(payload, refresh, projection))
}

export async function getDatacronNames(req, res) {
    let session = req.body.session
    let allyCode = req.body.allyCode

    processRequest(res, async () => {
        if(session && !(await DB.sessionIsPlayer(session, allyCode))) {
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
        if(session && !(await DB.sessionIsPlayer(session, allyCode))) {
            throw new MyError(401, 'Session Id is not player')
        }
        return DB.updateDatacronNames(body)
    })
}

export async function getInventory(req, res) {
    let session = req.headers.session
    let allyCode = req.headers.allycode
    processRequest(res, async () => {
        if(session && !(await DB.sessionIsPlayer(session, allyCode))) {
            throw new MyError(401, 'Session Id is not player')
        }
        return DB.getInventory(allyCode)
    })
}

export async function refreshInventory(req, res) {
    let session = req.headers.session
    let allyCode = req.headers.allycode
    processRequest(res, async () => {
        if(session && !(await DB.sessionIsPlayer(session, allyCode))) {
            throw new MyError(401, 'Session Id is not player')
        }
        return DB.refreshInventory(allyCode)
    })
}

export async function getAuthStatus(req, res) {
    let session = req.headers.session
    let allyCode = req.headers.allycode
    processRequest(res, async () => {
        if(session && !(await DB.sessionIsPlayer(session, allyCode))) {
            throw new MyError(401, 'Session Id is not player')
        }
        return Mhann.getUserAuthStatus(allyCode)
    })
}