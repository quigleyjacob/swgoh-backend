import DB from '../../lib/database.js'
import { processRequest } from '../../lib/validation.js'

export async function getSkills(req, res) {
    processRequest(res, () => DB.getSkills())
}