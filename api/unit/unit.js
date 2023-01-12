import DB from '../../lib/database.js'
import { processRequest } from '../../lib/validation.js'

export async function getUnitsMap(req, res) {
    processRequest(res, () => DB.getUnitsMap())
}

export async function getPlayableUnits(req, res) {
    let nameFragment = req.body.nameFragment || ''
    processRequest(res, () => DB.getPlayableUnits(nameFragment))
}