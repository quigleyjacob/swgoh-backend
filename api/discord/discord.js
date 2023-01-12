import DB from '../../lib/database.js'
import { processRequest } from '../../lib/validation.js'

export async function getAccounts(req, res) {
    let discordId = req.body.discordId
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
    let playerId = req.body.playerId
    processRequest(res, () => DB.setDefaultAccount(discordId, playerId))
}

export async function getDefaultGuild(req, res) {
    let discordId = req.body.discordId
    processRequest(res, () => DB.getDefaultGuild(discordId))
}

export async function getRoles(req, res) {
    let filter = req.body.filter
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
    processRequest(res, () => DB.registerUser(payload))
}

export async function unregisterUser(req, res) {
    let payload = req.body
    processRequest(res, () => DB.unregisterUser(payload))
}