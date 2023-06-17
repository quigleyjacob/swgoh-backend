import express from 'express'
import { getPlayerData, addGAC, getAllGAC, getAllSquads, addSquad, deleteSquad, updateDatacronNames, getCurrentGACBoard, getGameConnectionCount } from './player.js'
import { getDatacronNames } from './player.js'

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

router.route('/datacron')
    .post(getDatacronNames)

router.route('/datacron/update')
    .post(updateDatacronNames)

router.route('/gac/board')
    .post(getCurrentGACBoard)

router.route('/gameConnection')
    .post(getGameConnectionCount)

export default router