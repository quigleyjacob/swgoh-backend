import express from 'express'
import { refreshGuild, refreshLocalization, refreshPlayer, refreshUnits, refreshImages } from './refresh.js'

let router = express.Router()

router.route('/localization')
    .post(refreshLocalization)

router.route('/units')
    .post(refreshUnits)

router.route('/player/:allyCode')
    .post(refreshPlayer)

router.route('/guild/:id')
    .post(refreshGuild)

router.route('/images')
    .post(refreshImages)

export default router