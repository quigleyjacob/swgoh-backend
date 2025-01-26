import DiscordUser from '../../../lib/database/discord/user.js'
import { processRequest } from '../../../lib/validation.js'

export async function getAccounts(req, res) {
    let discordId = req.params.id
    processRequest(res, () => DiscordUser.getAccountsByDiscordId(discordId))
}