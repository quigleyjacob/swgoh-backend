import express from 'express'
import { registerUser, verifyUser, authenticateUser, getDiscordAuthURL } from './discord.js'
import user from './user/index.js'
import guild from './guild/index.js'
import build from './build/index.js'
import server from './server/index.js'

let router = express.Router()

router.route('/register')
    .post(registerUser)

router.route('/verify')
    .post(verifyUser)

router.route('/authURL')
    .post(getDiscordAuthURL)

router.route('/authenticate')
    .post(authenticateUser)

router.use('/user/:id', user)
router.use('/guild/:guildId', guild)
router.use('/build/:build', build)
router.use('/server/:serverId', server)

export default router