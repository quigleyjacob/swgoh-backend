import express from 'express'
import { getPlayer, addGAC, getAllGAC, updateDatacronNames, getCurrentGACBoard, getGameConnectionCount, getLatestBracketResults, getInventory, refreshInventory, getAuthStatus } from './player.js'
import { getDatacronNames } from './player.js'
import squad from './squad/index.js'
import defense from './defense/index.js'

let router = express.Router()

router.route('/')
    .post(getPlayer)

router.route('/gac')
    .post(getAllGAC)

router.route('/gac/add')
    .post(addGAC)

router.route('/gac/review')
    .post(getLatestBracketResults)

router.route('/datacron')
    .post(getDatacronNames)

router.route('/datacron/update')
    .post(updateDatacronNames)

router.route('/gac/board')
    .post(getCurrentGACBoard)

router.route('/gameConnection')
    .post(getGameConnectionCount)

router.route('/inventory')
    .get(getInventory)
    .post(refreshInventory)

router.route('/authStatus')
    .get(getAuthStatus)

router.use('/:allyCode/squad', squad)
router.use('/:allyCode/defense', defense)

export default router