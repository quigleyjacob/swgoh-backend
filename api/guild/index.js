import express from 'express'
import { getGuildData } from './guild.js'

let router = express.Router()

router.route('/')
    .post(getGuildData)

export default router