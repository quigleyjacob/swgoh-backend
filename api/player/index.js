import express from 'express'
import { getPlayerData, addGAC, getAllGAC } from './player.js'

let router = express.Router()

router.route('/')
    .post(getPlayerData)

router.route('/gac')
    .post(getAllGAC)

router.route('/gac/add')
    .post(addGAC)

export default router