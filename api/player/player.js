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

export async function getAllGAC(req, res) {
    let session = req.body.session
    let allyCode = req.body.allyCode
    processRequest(res, async() => {
        if(session && !(await DB.sessionIsPlayer(session, allyCode))) {
            throw new MyError(401, 'Session Id is not player')
        }
        return DB.getAllGAC(allyCode)
    })
}

export async function addGAC(req, res) {
    let session = req.body.session
    let gac = req.body.gac
    
    processRequest(res, async () => {
        if(session && !(await DB.sessionIsPlayer(session, gac.player.allyCode))) {
            throw new MyError(401, 'Session Id is not player')
        }
        return DB.addGAC(gac)
    })
}

export async function getDefenses(req, res) {
    let session = req.headers.session
    let allyCode = req.headers.allycode

    processRequest(res, async () => {
        if(session && !(await DB.sessionIsPlayer(session, allyCode))) {
            throw new MyError(401, 'Session Id is not player')
        }
        return DB.getDefenses(allyCode)
    })
}

export async function addDefense(req, res) {
    let session = req.headers.session
    let allyCode = req.headers.allycode
    let defenseData = req.body

    processRequest(res, async () => {
        if(session && !(await DB.sessionIsPlayer(session, allyCode))) {
            throw new MyError(401, 'Session Id is not player')
        }
        return DB.addDefense(allyCode, defenseData)
    })
}

export async function getDefense(req, res) {
    let session = req.headers.session
    let allyCode = req.headers.allycode
    let defenseId = req.params.defenseId

    processRequest(res, async () => {
        if(session && !(await DB.sessionIsPlayer(session, allyCode))) {
            throw new MyError(401, 'Session Id is not player')
        }
        return DB.getDefense(allyCode, defenseId)
    })
}

export async function updateDefense(req, res) {
    let session = req.headers.session
    let allyCode = req.headers.allycode
    let defenseId = req.params.defenseId
    let defenseData = req.body

    processRequest(res, async () => {
        if(session && !(await DB.sessionIsPlayer(session, allyCode))) {
            throw new MyError(401, 'Session Id is not player')
        }
        return DB.updateDefense(allyCode, defenseId, defenseData)
    })
}

export async function deleteDefense(req, res) {
    let session = req.headers.session
    let allyCode = req.headers.allycode
    let defenseId = req.params.defenseId

    processRequest(res, async () => {
        if(session && !(await DB.sessionIsPlayer(session, allyCode))) {
            throw new MyError(401, 'Session Id is not player')
        }
        return DB.deleteDefense(allyCode, defenseId)
    })
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

export async function getCurrentGACBoard(req, res) {
    let session = req.body.session
    let allyCode = req.body.allyCode
    processRequest(res, async () => {
        if(session && !(await DB.sessionIsPlayer(session, allyCode))) {
            throw new MyError(401, 'Session Id is not player')
        }
        return DB.getCurrentGACBoard(allyCode)
    })
}

export async function getGameConnectionCount(req, res) {
    let session = req.body.session
    let allyCode = req.body.allyCode
    processRequest(res, async () => {
        if(session && !(await DB.sessionIsPlayer(session, allyCode))) {
            throw new MyError(401, 'Session Id is not player')
        }
        return DB.getGameConnectionCount(session, allyCode)
    })
}

export async function getLatestBracketResults(req, res) {
    let session = req.body.session
    let allyCode = req.body.allyCode
    processRequest(res, async () => {
        if(session && !(await DB.sessionIsPlayer(session, allyCode))) {
            throw new MyError(401, 'Session Id is not player')
        }
        return DB.getLatestBracketResults(allyCode)
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