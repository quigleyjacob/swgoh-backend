import express from 'express'
import { getGuild, getOperations, getOperation, addOperation, deleteOperation, isGuildBuild, getDatacronTest, updateDatacronTest } from './guild.js'
import command from './command/index.js'

let router = express.Router()

router.route('/')
    .post(getGuild)

router.route('/operation')
    .post(getOperations)

router.route('/operation/one')
    .post(getOperation)

router.route('/operation/add')
    .post(addOperation)

router.route('/operation/delete')
    .post(deleteOperation)

router.route('/build')
    .post(isGuildBuild)

router.route('/datacronTest')
    .post(getDatacronTest)
    .put(updateDatacronTest)

router.use('/:guildId/command/', command)

export default router