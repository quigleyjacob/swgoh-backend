import express from 'express'
import player from './player/index.js'
import guild from './guild/index.js'
import refresh from './refresh/index.js'
import platoon from './platoon/index.js'
import image from './image/index.js'
import unit from './unit/index.js'
import category from './category/index.js'
import discord from './discord/index.js'
import data from './data/index.js'

let router = express.Router()

router.route('/')
    .get((req, res) => {
        res.send("Hello from /api/")
    })

router.use('/player', player)
router.use('/guild', guild)
router.use('/refresh', refresh)
router.use('/platoon', platoon)
router.use('/image', image)
router.use('/unit', unit)
router.use('/category', category)
router.use('/discord', discord)
router.use('/data', data)


export default router