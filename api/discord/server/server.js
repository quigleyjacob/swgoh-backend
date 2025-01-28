import Server from '../../../lib/database/discord/server.js'
import { processRequest } from '../../../lib/validation.js'

export async function getActiveBuilds(req, res) {
    let serverId = req.params.serverId
    processRequest(res, async () => Server.getActiveBuilds({serverId}))
}

export async function registerServer(req, res) {
    let build = req.params.build
    let serverId = req.params.serverId
    let payload = {...req.body, build, serverId}
    processRequest(res, () => Server.registerServer(serverId, build, payload))
}

export async function unregisterServer(req, res) {
    let serverId = req.params.serverId
    let buildId = req.params.build
    processRequest(res, () => Server.unregisterServer(serverId, buildId))
}