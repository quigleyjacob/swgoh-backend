import express from 'express'
import player from './player/index.js'
import guild from './guild/index.js'
import refresh from './refresh/index.js'
import platoon from './platoon/index.js'
import unit from './unit/index.js'
import category from './category/index.js'
import discord from './discord/index.js'
import data from './data/index.js'
import gac from './gac/index.js'
import datacron from './datacron/index.js'
import leaderboard from './leaderboard/index.js'
import arena from './arena/index.js'
import { validate } from '../middleware/index.js'

let router = express.Router()

router.use('*', validate)

router.route('/')
    .get((req, res) => {
        res.send("Hello from /api/")
    })

router.use('/player', player)
router.use('/guild', guild)
router.use('/refresh', refresh)
router.use('/platoon', platoon)
router.use('/unit', unit)
router.use('/category', category)
router.use('/discord', discord)
router.use('/data', data)
router.use('/gac', gac)
router.use('/datacron', datacron)
router.use('/leaderboard', leaderboard)
router.use('/arena', arena)


export default router