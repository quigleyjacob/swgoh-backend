import DB from '../../lib/database.js'
import { processRequest } from '../../lib/validation.js'

export async function getArenas(req, res) {
    processRequest(res, () => DB.getArenas())
}

export async function addArena(req, res) {
    let payload = req.body.payload
    processRequest(res, () => DB.addArena(payload))
}

export async function removeArena(req, res) {
    let allyCode = req.body.allyCode
    processRequest(res, () => DB.removeArena(allyCode))
}

export async function getArena(req, res) {
    let allyCode = req.body.allyCode
    processRequest(res, () => DB.getArena(allyCode))
}

export async function checkArena(req, res) {
    let allyCode = req.body.allyCode
    processRequest(res, () => DB.checkArena(allyCode))
}