import express from 'express'
import { getGuild, isGuildBuild, getDatacronTest, updateDatacronTest } from './guild.js'
import command from './command/index.js'
import operation from './operation/index.js'

let router = express.Router()

router.route('/')
    .post(getGuild)

router.route('/build')
    .post(isGuildBuild)

router.route('/datacronTest')
    .post(getDatacronTest)
    .put(updateDatacronTest)

router.use('/:guildId/command', command)
router.use('/:guildId/operation', operation)

export default router