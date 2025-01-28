import Refresh from '../../lib/database/refresh.js'
import { processRequest } from '../../lib/validation.js'

export async function refreshPlayer(req, res) {
    let payload  = req.body.payload
    let projection = {allyCode: 1}
    processRequest(res, () => Refresh.refreshPlayer(payload, projection))
}

export async function refreshPlayerArenas(req, res) {
    let allyCodeArray = req.body.allyCodeArray
    processRequest(res, () => Refresh.refreshPlayerArenas(allyCodeArray))
}

export async function refreshGuild(req, res) {
    let guildId = req.body.guildId
    let projection = {'profile.id': 1}
    processRequest(res, () => Refresh.refreshGuild(guildId, projection))
}