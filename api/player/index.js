import express from 'express'
import { getPlayerData } from './player.js'

let router = express.Router()

router.route('/:allyCode')
    .post(getPlayerData)

export default router