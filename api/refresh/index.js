import express from 'express'
import { refreshGuild, refreshLocalization, refreshPlayer, refreshUnits, refreshSkills, refreshBattleTargetingRule, refreshDatacron } from './refresh.js'

let router = express.Router()

router.route('/localization')
    .post(refreshLocalization)

router.route('/units')
    .post(refreshUnits)

router.route('/player')
    .post(refreshPlayer)

router.route('/guild')
    .post(refreshGuild)

router.route('/skill')
    .post(refreshSkills)

router.route('/battleTargetingRule')
    .post(refreshBattleTargetingRule)

router.route('/datacron')
    .post(refreshDatacron)

export default router