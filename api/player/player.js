import DB from '../../lib/database.js'
import { processRequest } from '../../lib/validation.js'

export async function getPlayerData(req, res)  {
    let refresh = req.body.refresh ? true : false
    let projection = req.body.projection
    let payload = req.body.payload
    processRequest(res, () => DB.getPlayerData(payload, refresh, projection))
}