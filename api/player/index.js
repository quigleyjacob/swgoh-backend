import express from 'express'
import { getPlayer, getAuthStatus, getPlayerArena, getAccounts } from './player.js'
import squad from './squad/index.js'
import defense from './defense/index.js'
import gac from './gac/index.js'
import inventory from './inventory/index.js'
import datacron from './datacron/index.js'

let router = express.Router()

router.route('/')
    .post(getPlayer)

router.route('/accounts')
    .get(getAccounts)

router.route('/arena')
    .post(getPlayerArena)

router.route('/authStatus')
    .get(getAuthStatus)

router.use('/:allyCode/squad', squad)
router.use('/:allyCode/defense', defense)
router.use('/:allyCode/gac', gac)
router.use('/:allyCode/inventory', inventory)
router.use('/:allyCode/datacron', datacron)

export default router