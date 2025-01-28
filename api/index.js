import express from 'express'
import player from './player/index.js'
import guild from './guild/index.js'
import refresh from './refresh/index.js'
import discord from './discord/index.js'
import data from './data/index.js'
import gac from './gac/index.js'
import leaderboard from './leaderboard/index.js'
import arena from './arena/index.js'
import { validate } from '../middleware/index.js'

let router = express.Router()

router.use('*', validate)

router.route('/')
    .get((req, res) => {
        res.send("Hello from /api/")
    })

router.use('/arena', arena)
router.use('/data', data)
router.use('/discord', discord)
router.use('/gac', gac)
router.use('/guild', guild)
router.use('/leaderboard', leaderboard)
router.use('/player', player)
router.use('/refresh', refresh)

export default router