import DB from '../../lib/database.js'
import { processRequest } from '../../lib/validation.js'

export async function getTasks(req, res) {
    processRequest(res, () => DB.getTasks(req.body))
}