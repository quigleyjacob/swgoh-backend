import express from 'express'
import { getGuildData, getCommands, getCommand, addCommand, deleteCommand } from './guild.js'

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

export default router