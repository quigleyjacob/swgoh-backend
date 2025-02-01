import Gac from '../../../lib/database/player/gac.js'
import Session from '../../../lib/database/session.js'
import { processRequest } from '../../../lib/validation.js'
import { MyError } from '../../../utils/error.js'


export async function getGacs(req, res) {
    let session = req.headers.session
    let allyCode = req.params.allyCode
    let projection = {_id: 1, league: 1, mode: 1, opponent: 1, time: 1}
    processRequest(res, async () => {
        if(session && !(await Session.sessionIsPlayer(session, allyCode))) {
            throw new MyError(401, 'Session Id is not player')
        }
        return Gac.getGacs(allyCode, projection)
    })
}

export async function addGac(req, res) {
    let session = req.headers.session
    let allyCode = req.params.allyCode
    let payload = {...req.body, player: {allyCode}}
    processRequest(res, async () => {
        if(session && !(await Session.sessionIsPlayer(session, allyCode))) {
            throw new MyError(401, 'Session Id is not player')
        }
        return Gac.addGac(allyCode, payload)
    })
}

export async function getGac(req, res) {
    let session = req.headers.session
    let allyCode = req.params.allyCode
    let id = req.params.id
    processRequest(res, async () => {
        if(session && !(await Session.sessionIsPlayer(session, allyCode))) {
            throw new MyError(401, 'Session Id is not player')
        }
        return Gac.getGac(id, allyCode)
    })
}

export async function updateGac(req, res) {
    let session = req.headers.session
    let allyCode = req.params.allyCode
    let id = req.params.id
    let payload = req.body
    processRequest(res, async () => {
        if(session && !(await Session.sessionIsPlayer(session, allyCode))) {
            throw new MyError(401, 'Session Id is not player')
        }
        return Gac.updateGac(id, allyCode, payload)
    })
}

export async function deleteGac(req, res) {
    let session = req.headers.session
    let allyCode = req.params.allyCode
    let id = req.params.id
    processRequest(res, async () => {
        if(session && !(await Session.sessionIsPlayer(session, allyCode))) {
            throw new MyError(401, 'Session Id is not player')
        }
        return Gac.deleteGac(id, allyCode)
    })
}

export async function getCurrentGACBoard(req, res) {
    let session = req.headers.session
    let allyCode = req.params.allyCode
    processRequest(res, async () => {
        if(session && !(await Session.sessionIsPlayer(session, allyCode))) {
            throw new MyError(401, 'Session Id is not player')
        }
        return Gac.getCurrentGACBoard(session, allyCode)
    })
}

export async function getLatestBracketResults(req, res) {
    let session = req.headers.session
    let allyCode = req.params.allyCode
    processRequest(res, async () => {
        if(session && !(await Session.sessionIsPlayer(session, allyCode))) {
            throw new MyError(401, 'Session Id is not player')
        }
        return Gac.getLatestBracketResults(allyCode)
    })
}

export async function getGacHistory(req, res) {
    let session = req.headers.session
    let allyCode = req.params.allyCode
    processRequest(res, async () => {
        if(session && !(await Session.sessionIsPlayer(session, allyCode))) {
            throw new MyError(401, 'Session Id is not player')
        }
        return Gac.getGacHistoryResults(allyCode, req.body)
    })
}

export async function loadGACPlanFromGameData(req, res) {
    let allyCode = req.params.allyCode
    let body = req.body
    processRequest(res, async () => {
        return Gac.loadGACPlanFromGameData(allyCode, body)
    })
}