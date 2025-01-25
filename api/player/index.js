import express from 'express'
import { getPlayer, updateDatacronNames, getInventory, refreshInventory, getAuthStatus } from './player.js'
import { getDatacronNames } from './player.js'
import squad from './squad/index.js'
import defense from './defense/index.js'
import gac from './gac/index.js'

let router = express.Router()

router.route('/')
    .post(getPlayer)

router.route('/datacron')
    .post(getDatacronNames)

router.route('/datacron/update')
    .post(updateDatacronNames)

router.route('/inventory')
    .get(getInventory)
    .post(refreshInventory)

router.route('/authStatus')
    .get(getAuthStatus)

router.use('/:allyCode/squad', squad)
router.use('/:allyCode/defense', defense)
router.use('/:allyCode/gac', gac)

export default router