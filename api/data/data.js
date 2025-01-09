import DB from '../../lib/database.js'
import { processRequest } from '../../lib/validation.js'

export async function getSkills(req, res) {
    processRequest(res, () => DB.getSkills())
}

export async function getData(req, res) {
    let type = req.body.type
    processRequest(res, () => DB.getData(type))
}

export async function getPortraits(req, res) {
    processRequest(res, () => DB.getPortraits())
}

export async function getPortrait(req, res) {
    let id = req.body.id
    processRequest(res, () => DB.getPortrait(id))
}

export async function getCurrency(req, res) {
    processRequest(res, () => DB.getCurrency())
}

export async function getMaterial(req, res) {
    processRequest(res, () => DB.getMaterial())
}

export async function getEquipment(req, res) {
    processRequest(res, () => DB.getEquipment())
}