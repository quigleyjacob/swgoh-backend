import { getIdealPlatoons } from '../../platoons/platoon.js'
import { processRequest } from '../../lib/validation.js'

export async function getPlatoonData(req, res) {
    let guildId = req.params.guildId
    let tb = req.params.tb
    let ls_phase = Number(req.params.ls_phase)
    let mix_phase = Number(req.params.mix_phase)
    let ds_phase = Number(req.params.ds_phase)
    processRequest(res, () => getIdealPlatoons(guildId, tb, ds_phase, mix_phase, ls_phase))
}