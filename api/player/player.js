import DB from '../../lib/database.js'
import { processRequest } from '../../lib/validation.js'

export async function getPlayerData(req, res)  {
    let refresh = req.query.refresh === "true" ? true : false
    let projection = req.query.projection
    let allyCode = req.params.allyCode
    processRequest(res, () => DB.getPlayerData(allyCode, refresh, projection))
}