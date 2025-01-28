import Leaderboard from '../../lib/database/leaderboard.js'
import { processRequest } from '../../lib/validation.js'

export async function getLeaderboards(req, res) {
    let projection = req.body.projection || {}
    processRequest(res, () => Leaderboard.getLeaderboards(projection))
}

export async function getLeaderboard(req, res) {
    let serverId = req.params.id
    processRequest(res, () => Leaderboard.getLeaderboard(serverId))
}

export async function setLeaderboard(req, res) {
    let serverId = req.params.id
    let channelId = req.body.channelId
    let messageId = req.body.messageId
    processRequest(res, () => Leaderboard.setLeaderboardChannel(serverId, channelId, messageId))
}

export async function unsetLeaderboard(req, res) {
    let serverId = req.params.id
    processRequest(res, () => Leaderboard.unsetLeaderboardChannel(serverId))
}

export async function addAccountToLeaderboard(req, res) {
    let allyCode = req.params.allyCode
    let serverId = req.params.id
    processRequest(res, () => Leaderboard.addAccountToLeaderboard(allyCode, serverId))
}

export async function removeAccountFromLeaderboard(req, res) {
    let allyCode = req.params.allyCode
    let serverId = req.params.id
    processRequest(res, () => Leaderboard.removeAccountFromLeaderboard(allyCode, serverId))
}