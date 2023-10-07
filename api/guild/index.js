import express from 'express'
import { getGuildData, getCommands, getCommand, addCommand, deleteCommand, getOperations, getOperation, addOperation, deleteOperation, isGuildBuild, getDatacronTest, updateDatacronTest } from './guild.js'

let router = express.Router()

router.route('/')
    .post(getGuildData)

router.route('/command')
    .post(getCommands)

router.route('/command/one')
    .post(getCommand)

router.route('/command/add')
    .post(addCommand)

router.route('/command/delete')
    .post(deleteCommand)

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

export default router