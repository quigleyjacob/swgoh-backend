import express from 'express'
import { refreshGuild, refreshPlayer, refreshPlayerArenas } from './refresh.js'

let router = express.Router()

router.route('/player')
    .post(refreshPlayer)

router.route('/player/arena')
    .post(refreshPlayerArenas)

router.route('/guild')
    .post(refreshGuild)

export default router