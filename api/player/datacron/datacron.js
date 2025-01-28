import PlayerDatacron from '../../../lib/database/player/datacron.js'
import Session from '../../../lib/database/session.js'
import { MyError } from '../../../utils/error.js'
import { processRequest } from '../../../lib/validation.js'

export async function getDatacronNames(req, res) {
    let session = req.headers.session
    let allyCode = req.params.allyCode

    processRequest(res, async () => {
        if(session && !(await Session.sessionIsPlayer(session, allyCode))) {
            throw new MyError(401, 'Session Id is not player')
        }
        return PlayerDatacron.getDatacronNames(allyCode)
    })
}

export async function updateDatacronNames(req, res) {
    let body = req.body
    let allyCode = req.params.allyCode
    let session = req.headers.session
    processRequest(res, async () => {
        if(session && !(await Session.sessionIsPlayer(session, allyCode))) {
            throw new MyError(401, 'Session Id is not player')
        }
        return PlayerDatacron.updateDatacronNames(body)
    })
}