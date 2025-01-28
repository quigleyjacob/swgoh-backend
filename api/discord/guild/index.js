import express from 'express'
import { getGuildMemberDiscordRegistrations } from './guild.js'
import role from './role/index.js'

let router = express.Router({mergeParams: true})

router.route('/')
    .get(getGuildMemberDiscordRegistrations)

router.use('/role', role)

export default router