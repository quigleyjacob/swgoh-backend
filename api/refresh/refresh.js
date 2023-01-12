import DB from '../../lib/database.js'
import { processRequest } from '../../lib/validation.js'

export async function refreshLocalization(req, res) {
    processRequest(res, () => DB.refreshLocalization())
}

export async function refreshUnits(req, res) {
    processRequest(res, () => DB.refreshUnits())
}

export async function refreshPlayer(req, res) {
    let payload  = req.body.payload
    processRequest(res, () => DB.refreshPlayer(payload))
}

export async function refreshGuild(req, res) {
    let guildId = req.body.guildId
    let detailed = req.body.detailed ? true : false
    console.log(detailed)
    processRequest(res, () => DB.refreshGuild(guildId, detailed))
}

export async function refreshImages(req, res) {
    processRequest(res, () => DB.refreshImages())
}