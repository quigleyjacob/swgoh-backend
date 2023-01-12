import DB from '../../lib/database.js'
import { processRequest } from '../../lib/validation.js'

export async function getUnitImage(req, res) {
    let baseId = req.params.baseId
    processRequest(res, () => DB.getUnitImage(baseId))
}