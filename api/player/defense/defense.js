import DB from '../../../lib/database.js'
import { processRequest } from '../../../lib/validation.js'
import { MyError } from '../../../utils/error.js'
import Defense from '../../../lib/database/player/defense.js'

export async function getDefenses(req, res) {
    let session = req.headers.session
    let allyCode = req.params.allyCode
    processRequest(res, async () => {
        if(session && !(await DB.sessionIsPlayer(session, allyCode))) {
            throw new MyError(401, 'Session Id is not player')
        }
        return Defense.getDefenses(allyCode)
    })
}

export async function addDefense(req, res) {
    let session = req.headers.session
    let allyCode = req.params.allyCode
    let defenseData = {...req.body, allyCode}

    processRequest(res, async () => {
        if(session && !(await DB.sessionIsPlayer(session, allyCode))) {
            throw new MyError(401, 'Session Id is not player')
        }
        return Defense.addDefense(allyCode, defenseData)
    })
}

export async function getDefense(req, res) {
    let session = req.headers.session
    let allyCode = req.params.allyCode
    let defenseId = req.params.id

    processRequest(res, async () => {
        if(session && !(await DB.sessionIsPlayer(session, allyCode))) {
            throw new MyError(401, 'Session Id is not player')
        }
        return Defense.getDefense(defenseId, allyCode)
    })
}

export async function updateDefense(req, res) {
    let session = req.headers.session
    let allyCode = req.params.allyCode
    let defenseId = req.params.id
    let defenseData = {...req.body, allyCode}

    processRequest(res, async () => {
        if(session && !(await DB.sessionIsPlayer(session, allyCode))) {
            throw new MyError(401, 'Session Id is not player')
        }
        return Defense.updateDefense(defenseId, allyCode, defenseData)
    })
}

export async function deleteDefense(req, res) {
    let session = req.headers.session
    let allyCode = req.params.allyCode
    let defenseId = req.params.id

    processRequest(res, async () => {
        if(session && !(await DB.sessionIsPlayer(session, allyCode))) {
            throw new MyError(401, 'Session Id is not player')
        }
        return Defense.deleteDefense(defenseId, allyCode)
    })
}