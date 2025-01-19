import express from 'express'
import { refreshGuild, refreshPlayer } from './refresh.js'

let router = express.Router()

router.route('/player')
    .post(refreshPlayer)

router.route('/guild')
    .post(refreshGuild)

export default router