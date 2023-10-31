import DB from '../../lib/database.js'
import { processRequest } from '../../lib/validation.js'

export async function refreshLocalization(req, res) {
    processRequest(res, () => DB.refreshLocalization())
}

export async function refreshUnits(req, res) {
    processRequest(res, () => DB.refreshUnits())
}

export async function refreshPlayer(req, res) {
    let payload  = req.body.payload
    processRequest(res, () => DB.refreshPlayer(payload))
}

export async function refreshGuild(req, res) {
    let guildId = req.body.guildId
    let detailed = req.body.detailed ? true : false
    processRequest(res, () => DB.refreshGuild(guildId, detailed))
}

export async function refreshSkills(req, res) {
    processRequest(res, () => DB.refreshSkills())
}

export async function refreshBattleTargetingRule(req, res) {
    processRequest(res, () => DB.refreshBattleTargetingRule())
}

export async function refreshDatacron(req, res) {
    processRequest(res, () => DB.refreshDatacron())
}

export async function refreshAbility(req, res) {
    processRequest(res, () => DB.refreshAbility())
}