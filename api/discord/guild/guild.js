import DiscordGuild from '../../../lib/database/discord/guild/guild.js'
import { processRequest } from '../../../lib/validation.js'

export async function getGuildMemberDiscordRegistrations(req, res) {
    let guildId = req.params.guildId
    processRequest(res, () => DiscordGuild.getGuildMemberDiscordRegistrations(guildId))
}