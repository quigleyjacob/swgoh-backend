import express from 'express'
import { getPlayer, updateDatacronNames, getAuthStatus, getDatacronNames, getPlayerArena } from './player.js'
import squad from './squad/index.js'
import defense from './defense/index.js'
import gac from './gac/index.js'
import inventory from './inventory/index.js'

let router = express.Router()

router.route('/')
    .post(getPlayer)

router.route('/arena')
    .post(getPlayerArena)

router.route('/datacron')
    .post(getDatacronNames)

router.route('/datacron/update')
    .post(updateDatacronNames)

router.route('/authStatus')
    .get(getAuthStatus)

router.use('/:allyCode/squad', squad)
router.use('/:allyCode/defense', defense)
router.use('/:allyCode/gac', gac)
router.use('/:allyCode/inventory', inventory)

export default router