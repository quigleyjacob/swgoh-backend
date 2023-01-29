import express from 'express'
import { getGuildData, getCommands, addCommand } from './guild.js'

let router = express.Router()

router.route('/')
    .post(getGuildData)

router.route('/command')
    .post(getCommands)

router.route('/command/add')
    .post(addCommand)

export default router