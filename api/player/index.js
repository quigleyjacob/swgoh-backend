import express from 'express'
import { getPlayerData, addGAC, getAllGAC, getAllSquads, addSquad, deleteSquad } from './player.js'

let router = express.Router()

router.route('/')
    .post(getPlayerData)

router.route('/gac')
    .post(getAllGAC)

router.route('/gac/add')
    .post(addGAC)

router.route('/squad')
    .post(getAllSquads)

router.route('/squad/add')
    .post(addSquad)

router.route('/squad/delete')
    .post(deleteSquad)



export default router