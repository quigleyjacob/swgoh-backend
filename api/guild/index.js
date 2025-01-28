import express from 'express'
import { getGuild, isGuildBuild } from './guild.js'
import command from './command/index.js'
import operation from './operation/index.js'
import datacron from './datacron/index.js'

let router = express.Router()

router.route('/')
    .post(getGuild)

router.route('/:guildId/build')
    .get(isGuildBuild)

router.use('/:guildId/command', command)
router.use('/:guildId/operation', operation)
router.use('/:guildId/datacron', datacron)

export default router