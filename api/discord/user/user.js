import DiscordUser from '../../../lib/database/discord/user.js'
import Operation from '../../../lib/database/guild/operation.js'
import Guild from '../../../lib/database/guild/guild.js'
import { processRequest } from '../../../lib/validation.js'
import { MyError } from '../../../utils/error.js'

export async function getAccounts(req, res) {
    let discordId = req.params.id
    let ignoreCache = req.query.ignoreCache === 'true'
    processRequest(res, () => DiscordUser.getAccountsByDiscordId(discordId, ignoreCache))
}

export async function deployOperations(req, res) {
    let discordId = req.params.id
    let body = req.body
    let discordKey = req.headers['discord-api-key']
    let DISCORD_API_KEY = process.env.DISCORD_API_KEY

    processRequest(res, async () => {
        if(!body || !body.messageId || !body.channelId) {
            throw new MyError(400, 'Payload requires messageId and channelId')
        }
        if(!discordKey || discordKey !== DISCORD_API_KEY) {
            throw new MyError(401, 'Invalid API key')
        }

        const deploymentResult = await Operation.deployOperationsByDirectMessage(body.messageId, body.channelId, discordId)

        return {
            message: deploymentResult.message,
            allyCode: deploymentResult.allyCode,
            userDiscordId: deploymentResult.userDiscordId
        }
    })
}