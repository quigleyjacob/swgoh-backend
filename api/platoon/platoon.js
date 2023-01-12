import { getIdealPlatoons } from '../../platoons/platoon.js'
import { processRequest } from '../../lib/validation.js'

export async function getPlatoonData(req, res) {
    let payload = req.body
    processRequest(res, () => getIdealPlatoons(payload))
}