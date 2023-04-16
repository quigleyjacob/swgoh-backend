import DB from '../../lib/database.js'
import { processRequest } from '../../lib/validation.js'

export async function getActiveDatacrons(req, res) {
    processRequest(res, () => DB.getActiveDatacrons())
}