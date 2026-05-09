import DiscordUser from '../../../lib/database/discord/user.js'
import { processRequest } from '../../../lib/validation.js'

export async function getAccounts(req, res) {
    let discordId = req.params.id
    let ignoreCache = req.query.ignoreCache === 'true'
    processRequest(res, () => DiscordUser.getAccountsByDiscordId(discordId, ignoreCache))
}