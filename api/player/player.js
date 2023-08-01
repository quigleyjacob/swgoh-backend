import DB from '../../lib/database.js'
import { MyError } from '../../lib/error.js'
import { processRequest } from '../../lib/validation.js'

export async function getPlayerData(req, res)  {
    let refresh = req.body.refresh ? true : false
    let projection = req.body.projection
    let payload = req.body.payload
    processRequest(res, () => DB.getPlayerData(payload, refresh, projection))
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

export async function getAllSquads(req, res) {
    let session = req.body.session
    let allyCode = req.body.allyCode

    processRequest(res, async () => {
        if(session && !(await DB.sessionIsPlayer(session, allyCode))) {
            throw new MyError(401, 'Session Id is not player')
        }
        return DB.getSquads(allyCode)
    })
}

export async function addSquad(req, res) {
    let session = req.body.session
    let allyCode = req.body.payload.allyCode
    let squadData = req.body.payload

    processRequest(res, async () => {
        if(session && !(await DB.sessionIsPlayer(session, allyCode))) {
            throw new MyError(401, 'Session Id is not player')
        }
        return DB.addSquad(squadData)
    })
}

export async function deleteSquad(req, res) {
    let session = req.body.session
    let allyCode = req.body.allyCode
    let squadId = req.body.squadId

    processRequest(res, async () => {
        if(session && !(await DB.sessionIsPlayer(session, allyCode))) {
            throw new MyError(401, 'Session Id is not player')
        }
        return DB.deleteSquad(squadId)
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
        return DB.getCurrentGACBoard(session, allyCode)
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