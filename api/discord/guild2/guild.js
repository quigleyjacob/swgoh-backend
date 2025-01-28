import DB from '../../../lib/database/database.js'
import { processRequest } from '../../../lib/validation.js'

export async function getGuildMemberDiscordRegistrations(req, res) {
    let guildId = req.params.id
    processRequest(res, () => DB.getGuildMemberDiscordRegistrations(guildId))
}