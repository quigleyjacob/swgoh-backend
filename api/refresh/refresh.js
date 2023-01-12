import DB from '../../lib/database.js'
import { processRequest } from '../../lib/validation.js'

export async function refreshLocalization(req, res) {
    processRequest(res, () => DB.refreshLocalization())
}

export async function refreshUnits(req, res) {
    processRequest(res, () => DB.refreshUnits())
}

export async function refreshPlayer(req, res) {
    let allyCode = req.params.allyCode
    processRequest(res, () => DB.refreshPlayer({"allyCode": allyCode}))
}

export async function refreshGuild(req, res) {
    let guildId = req.params.id
    let detailed = req.params.detailed === "true" ? true : false
    processRequest(res, () => DB.refreshGuild(guildId, detailed))
}

export async function refreshImages(req, res) {
    processRequest(res, () => DB.refreshImages())
}