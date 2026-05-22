import express from 'express'
import { getGuild, isGuildBuild } from './guild.js'
import { refreshGuildJob } from './refreshJob.js'
import command from './command/index.js'
import operation from './operation/index.js'
import datacron from './datacron/index.js'
import raid from './raid/index.js'

let router = express.Router()

router.route('/').post(getGuild)

router.route('/refresh-job')
    .post(refreshGuildJob)

router.route('/:guildId/build')
    .get(isGuildBuild)

router.use('/:guildId/command', command)
router.use('/:guildId/operation', operation)
router.use('/:guildId/datacron', datacron)
router.use('/:guildId/raid', raid)

export default router