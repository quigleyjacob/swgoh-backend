import Session from '../../../lib/database/session.js'
import Inventory from '../../../lib/database/player/inventory.js'
import { processRequest } from '../../../lib/validation.js'
import { MyError } from '../../../utils/error.js'

export async function getInventory(req, res) {
    let session = req.headers.session
    let allyCode = req.params.allyCode
    let refresh = req.query.refresh === 'true'
    processRequest(res, async () => {
        if(session && !(await Session.sessionIsPlayer(session, allyCode))) {
            throw new MyError(401, 'Session Id is not player')
        }
        let user = Session.sessionToDiscord(session)
        return Inventory.getInventory(allyCode, user.id, refresh)
    })
}