import DB from '../../lib/database.js'
import { processRequest } from '../../lib/validation.js'

export async function getUnitsMap(req, res) {
    processRequest(res, () => DB.getUnitsMap())
}

export async function getPlayableUnits(req, res) {
    let nameFragment = req.body.nameFragment || ''
    let projection = req.body.projection || {_id: 0, nameKey: 1, baseId: 1}
    let limit = req.body.limit || 0
    processRequest(res, () => DB.getPlayableUnits(nameFragment, projection, limit))
}