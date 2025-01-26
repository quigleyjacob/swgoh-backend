import Registry from '../../lib/registry.js'
import Session from '../../lib/database/session.js'
import OAuth from '../../lib/oauth.js'
import { processRequest } from '../../lib/validation.js'

export async function registerUser(req, res) {
    let payload = req.body
    if(req.body.session !== undefined) {
        let discordUser = await Session.sessionToDiscord(req.body.session)
        payload.discordId = discordUser.id
    }
    let { discordId, allyCode } = payload
    processRequest(res, () => Registry.registerDiscordUser(discordId, allyCode))
}

export async function verifyUser(req, res) {
    let payload = req.body
    if(req.body.session !== undefined) {
        let discordUser = await Session.sessionToDiscord(req.body.session)
        payload.discordId = discordUser.id
    }
    let { discordId, allyCode } = payload
    processRequest(res, () => Registry.registerDiscordUser(discordId, allyCode))
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