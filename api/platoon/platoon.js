import { getIdealPlatoons } from '../../platoons/platoon.js'
import { processRequest } from '../../lib/validation.js'
import DB from '../../lib/database.js'

export async function computeIdealPlatoons(req, res) {
    let payload = req.body
    processRequest(res, () => getIdealPlatoons(payload))
}

export async function getPlatoonData(req, res) {
    processRequest(res, () => DB.getPlatoons("ROTE"))
}