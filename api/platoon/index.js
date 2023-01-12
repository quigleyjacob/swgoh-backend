import express from 'express'
import { getPlatoonData } from './platoon.js'

let router = express.Router()

router.route('/:guildId/:tb/:ds_phase/:mix_phase/:ls_phase')
    .post(getPlatoonData)

export default router