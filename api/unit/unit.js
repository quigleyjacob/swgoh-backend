import DB from '../../lib/database.js'
import { processRequest } from '../../lib/validation.js'

export async function getUnitsMap(req, res) {
    processRequest(res, () => DB.getUnitsMap())
}