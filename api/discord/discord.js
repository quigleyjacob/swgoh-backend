import DB from '../../lib/database.js'
import OAuth from '../../lib/oauth.js'
import { processRequest } from '../../lib/validation.js'

export async function getAccounts(req, res) {
    let session = req.body.session
    let discordId = session === undefined ? req.body.discordId : (await DB.sessionToDiscord(session)).id
    processRequest(res, () => DB.getAccountsByDiscordId(discordId))
}

export async function getGuilds(req, res) {
    let discordId = req.body.discordId
    processRequest(res, () => DB.getGuildsByDiscordId(discordId))
}

export async function getDefaultAccount(req, res) {
    let discordId = req.body.discordId
    processRequest(res, () => DB.getDefaultAccount(discordId))
}

export async function setDefaultAccount(req, res) {
    let discordId = req.body.discordId
    let allyCode = req.body.allyCode
    processRequest(res, () => DB.setDefaultAccount(discordId, allyCode))
}

export async function getDefaultGuild(req, res) {
    let discordId = req.body.discordId
    processRequest(res, () => DB.getDefaultGuild(discordId))
}

export async function getRoles(req, res) {
    let filter = req.body.filter
    console.log(filter)
    processRequest(res, () => DB.getRoles(filter))
}

export async function addRole(req, res) {
    let role = req.body.role
    processRequest(res, () => DB.addRole(role))
}

export async function removeRole(req, res) {
    let role = req.body.role
    processRequest(res, () => DB.removeRole(role))
}

export async function registerUser(req, res) {
    let payload = req.body
    if(req.body.session !== undefined) {
        let discordUser = await DB.sessionToDiscord(req.body.session)
        payload.discordId = discordUser.id
    }
    processRequest(res, () => DB.registerUser(payload))
}

export async function verifyUser(req, res) {
    let payload = req.body
    if(req.body.session !== undefined) {
        let discordUser = await DB.sessionToDiscord(req.body.session)
        payload.discordId = discordUser.id
    }
    processRequest(res, () => DB.verifyUser(payload))
}

export async function unregisterUser(req, res) {
    let payload = req.body
    processRequest(res, () => DB.unregisterUser(payload))
}

export async function getGuildMemberDiscordRegistrations(req, res) {
    let guildId = req.body.guildId
    processRequest(res, () => DB.getGuildMemberDiscordRegistrations(guildId))
}

export async function getServerRegistrations(req, res) {
    let filter = req.body.filter
    processRequest(res, () => DB.getServerRegistrations(filter))
}

export async function registerServer(req, res) {
    let payload = req.body.payload
    processRequest(res, () => DB.registerServer(payload))
}

export async function unregisterServer(req, res) {
    let serverId = req.body.serverId
    let build = req.body.build
    processRequest(res, () => DB.unregisterServer(serverId, build))
}

export async function getActiveBuilds(req, res) {
    let serverId = req.body.serverId
    let payload = {
        serverId: serverId
    }
    processRequest(res, async () => DB.getActiveBuilds(payload))
}

export async function getDiscordAuthURL(req, res) {
    let redirectUri = req.body.redirectUri
    processRequest(res, () => OAuth.getDiscordAuthURL(redirectUri))
}

export async function authenticateUser(req, res) {
    let code = req.body.code
    let state = req.body.state
    let redirectUri = req.body.redirectUri
    if(code && state) {
        processRequest(res, () => OAuth.authenticateUser(code, state, redirectUri))
    }
}