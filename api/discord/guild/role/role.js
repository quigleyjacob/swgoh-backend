import Role from '../../../../lib/database/discord/guild/role.js'
import { processRequest } from '../../../../lib/validation.js'

export async function getRoles(req, res) {
    let guildId = req.params.guildId
    processRequest(res, () => Role.getRoles(guildId))
}

export async function addRole(req, res) {
    let guildId = req.params.guildId
    let role = {...req.body, guildId}
    processRequest(res, () => Role.addRole(role))
}

export async function removeRole(req, res) {
    let guildId = req.params.guildId
    let roleId = req.params.roleId
    processRequest(res, () => Role.removeRole(roleId, guildId))
}