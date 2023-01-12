import express from 'express'
import { getAccounts, getGuilds, getDefaultAccount, getDefaultGuild, getRoles, addRole, removeRole, registerUser, unregisterUser, setDefaultAccount } from './discord.js'

let router = express.Router()

router.route('/')
    .post((req, res) => res.send("greeting from /api/discord/"))

router.route('/user')
    .post(getAccounts)

router.route('/user/default')
    .post(getDefaultAccount)

    router.route('/user/default/set')
    .post(setDefaultAccount)

router.route('/guild')
    .post(getGuilds)

router.route('/guild/default')
    .post(getDefaultGuild)

router.route('/guild/role')
    .post(getRoles)

router.route('/guild/role/add')
    .post(addRole)

router.route('/guild/role/remove')
    .post(removeRole)

router.route('/register')
    .post(registerUser)

router.route('/unregister')
    .post(unregisterUser)

export default router