import express from 'express'
import { getLatestGacNumber, addGACReport, addGACHistory, getGACBattles } from './gac.js'

let router = express.Router()

router.route('/')
    .post(getGACBattles)

router.route('/latest')
    .post(getLatestGacNumber)

router.route('/insert')
    .post(addGACReport)

router.route('/insertAll')
    .post(addGACHistory)

export default router