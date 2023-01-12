import DB from '../../lib/database.js'
import { processRequest } from '../../lib/validation.js'

export async function getCategoryList(req, res) {
    processRequest(res, () => DB.getCategoryList())
}