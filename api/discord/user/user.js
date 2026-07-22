import DiscordUser from '../../../lib/database/discord/user.js'
import Operation from '../../../lib/database/guild/operation.js'
import Guild from '../../../lib/database/guild/guild.js'
import Session from '../../../lib/database/session.js'
import { processRequest } from '../../../lib/validation.js'
import { MyError } from '../../../utils/error.js'
import Command from '../../../lib/database/guild/command.js'
import Gac from '../../../lib/database/player/gac.js'

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

export async function getSettings(req, res) {
    let discordId = req.params.id
    let session = req.headers.session

    processRequest(res, async () => {
        if(session) {
            discordId = (await Session.sessionToDiscord(session)).id
        }

        let settings = await DiscordUser.getSettings(discordId)
        if(settings === null) {
            throw new MyError(404, `No settings found for user [id=${discordId}]`)
        }
        return settings
     })
}

export async function updateSettings(req, res) {
    let discordId = req.params.id
    let session = req.headers.session
    let settings = req.body

    processRequest(res, async () => {
        if(session) {
            discordId = (await Session.sessionToDiscord(session)).id
        }

        return DiscordUser.updateSettings(discordId, settings)
    })
}

export async function getCommandOptions(req, res) {
    let discordId = req.params.id
    let type = req.query.type
    let guildId = req.query.guildId

    processRequest(res, async () => {
        if(!guildId) {
            guildId = await DiscordUser.getDefaultGuildId(discordId)
        }
        if(!guildId) {
            throw new MyError(400, 'Unable to determine default guild.')
        }

        return Command.getCommands(guildId, type, {_id: 1, title: 1})
    })
}

export async function getOperationOptions(req, res) {
    let discordId = req.params.id
    let guildId = req.query.guildId

    processRequest(res, async () => {
        if(!guildId) {
            guildId = await DiscordUser.getDefaultGuildId(discordId)
        }
        if(!guildId) {
            throw new MyError(400, 'Unable to determine default guild.')
        }
        
        return Operation.getOperations(guildId, {_id: 1, title: 1})
    })
}

export async function getGacBoard(req, res) {
    let discordId = req.params.id
    let allyCode = req.query.allyCode
    let renderMode = req.query.renderMode || 'both'
    processRequest(res, async () => {
        if(!allyCode) {
            allyCode = await DiscordUser.getDefaultAllyCode(discordId)
        }
        if(!allyCode) {
            throw new MyError(400, 'Unable to determine default account.')
        }
        return Gac.generateGacBoardImage(discordId, allyCode, renderMode)
    })
}