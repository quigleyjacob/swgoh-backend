import DB from '../../lib/database.js'
import { processRequest } from '../../lib/validation.js'

export async function getGuildData(req, res) {
    let refresh = req.query.refresh == "true" ? true : false
    let detailed = req.query.detailed == "true" ? true : false
    let id = req.params.id
    let projection = req.query.projection
    processRequest(res, () => DB.getGuildData(id, refresh, detailed, projection))
}