import GG from "../../lib/gg.js"
import { processRequest } from "../../lib/validation.js"


export async function getLatestGacNumber(req, res) {
    processRequest(res, () => GG.getLatestGacNumber())
}

export async function addGACReport(req, res) {
    let allyCode = req.body.allyCode
    let gacNumber = req.body.gacNumber
    let roundNumber = req.body.roundNumber
    processRequest(res, () => GG.insertGACHistory(allyCode, gacNumber, roundNumber))
}

export async function addGACHistory(req, res) {
    let allyCode = req.body.allyCode
    processRequest(res, () => GG.addEntireHistory(allyCode))
}

export async function getGACBattles(req, res) {
    let mode = Number(req.body.mode)
    let combatType = Number(req.body.combatType)
    let allyCode = String(req.body.allyCode)
    let win = Boolean(req.body.win)
    console.log(mode, combatType, allyCode, win)
    console.log(typeof win)
    processRequest(res, () => GG.getGACBattles(mode, combatType, allyCode, win))
}