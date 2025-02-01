import Player from '../../lib/database/player/player.js'
import Data from '../../lib/database/data.js'
import { processRequest } from '../../lib/validation.js'

export async function getSkills(req, res) {
    processRequest(res, () => Data.getSkills())
}

export async function getData(req, res) {
    let type = req.params.type
    processRequest(res, () => Data.getData(type))
}

export async function getPortrait(req, res) {
    let id = req.params.id
    processRequest(res, () => Data.getPortrait(id))
}

export async function getCurrency(req, res) {
    processRequest(res, () => Data.getCurrency())
}

export async function getMaterial(req, res) {
    processRequest(res, () => Data.getMaterial())
}

export async function getEquipment(req, res) {
    processRequest(res, () => Data.getEquipment())
}

export async function getUnits(req, res) {
    processRequest(res, () => Data.getUnits())
}

export async function getCategory(req, res) {
    processRequest(res, () => Data.getCategoryList())
}

export async function getPlatoons(req, res) {
    processRequest(res, () => Data.getPlatoons('ROTE'))
}

export async function getAbilities(req, res) {
    let abilityIdList = req.query?.ability?.split(',') || []
    processRequest(res, () => Data.getAbilityList(abilityIdList, 'nameKey'))
}

export async function getPlayerScores(req, res) {
    let allyCodeArray = req.body.allyCodeArray
    let projection = {modScore: 1, gacPowerScore: 1, galacticPower: 1, allyCode: 1}
    processRequest(res, () => Player.getPlayers(allyCodeArray, projection, 'allyCode', false, true))
}