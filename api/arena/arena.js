import Arena from '../../lib/database/arena.js'
import { processRequest } from '../../lib/validation.js'

export async function addArena(req, res) {
    let payload = req.body.payload
    processRequest(res, () => Arena.addArena(payload))
}

export async function removeArena(req, res) {
    let allyCode = req.params.allyCode
    processRequest(res, () => Arena.removeArena(allyCode))
}

export async function getArena(req, res) {
    let allyCode = req.params.allyCode
    processRequest(res, () => Arena.getArena(allyCode))
}

export async function checkArenas(req, res) {
    processRequest(res, () => Arena.checkArenas())
}