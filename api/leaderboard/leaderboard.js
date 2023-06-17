import DB from '../../lib/database.js'
import { processRequest } from '../../lib/validation.js'

export async function getLeaderboards(req, res) {
    let projection = req.body.projection || {}
    processRequest(res, () => DB.getLeaderboards(projection))
}

export async function getLeaderboard(req, res) {
    let serverId = req.body.serverId
    processRequest(res, () => DB.getLeaderboard(serverId))
}

export async function setLeaderboard(req, res) {
    let serverId = req.body.serverId
    let channelId = req.body.channelId
    let messageId = req.body.messageId
    processRequest(res, () => DB.setLeaderboardChannel(serverId, channelId, messageId))
}

export async function unsetLeaderboard(req, res) {
    let serverId = req.body.serverId
    processRequest(res, () => DB.unsetLeaderboardChannel(serverId))
}

export async function addAccountToLeaderboard(req, res) {
    let allyCode = req.body.allyCode
    let serverId = req.body.serverId
    processRequest(res, () => DB.addAccountToLeaderboard(allyCode, serverId))
}

export async function removeAccountFromLeaderboard(req, res) {
    let allyCode = req.body.allyCode
    let serverId = req.body.serverId
    processRequest(res, () => DB.removeAccountFromLeaderboard(allyCode, serverId))
}

export async function getAccountsFromAllyCodeArray(req, res) {
    let allyCodes = req.body.allyCodes
    let projection = req.body.projection || {}
    processRequest(res, () => DB.getAccountsFromAllyCodeArray(allyCodes, projection))
}

export async function refreshAccountsInLeaderboard(req, res) {
    let serverId = req.body.serverId
    processRequest(res, () => DB.refreshAccountsInLeaderboard(serverId))
}