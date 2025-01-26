import Squad from '../../../lib/database/player/squad.js'
import { processRequest } from '../../../lib/validation.js'
import Session from '../../../lib/database/session.js'

export async function getAllSquads(req, res) {
    let session = req.headers.session
    let allyCode = req.params.allyCode
    processRequest(res, async () => {
        if(session && !(await Session.sessionIsPlayer(session, allyCode))) {
            throw new MyError(401, 'Session Id is not player')
        }
        return Squad.getSquads(allyCode)
    })
}

export async function addSquad(req, res) {
    let session = req.headers.session
    let allyCode = req.params.allyCode
    let payload = {...req.body, allyCode}

    processRequest(res, async () => {
        if(session && !(await Session.sessionIsPlayer(session, allyCode))) {
            throw new MyError(401, 'Session Id is not player')
        }
        return Squad.addSquad(payload)
    })
}

export async function deleteSquad(req, res) {
    let session = req.headers.session
    let allyCode = req.params.allyCode
    let squadId = req.params.id

    processRequest(res, async () => {
        if(session && !(await Session.sessionIsPlayer(session, allyCode))) {
            throw new MyError(401, 'Session Id is not player')
        }
        return Squad.deleteSquad(squadId, allyCode)
    })
}