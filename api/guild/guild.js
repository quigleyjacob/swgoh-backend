import DB from '../../lib/database.js'
import { processRequest } from '../../lib/validation.js'

export async function getGuildData(req, res) {
    let refresh = req.body.refresh ? true : false
    let detailed = req.body.detailed ? true : false
    let guildId = req.body.guildId
    let projection = req.body.projection || {}
    processRequest(res, () => DB.getGuildData(guildId, refresh, detailed, projection))
}