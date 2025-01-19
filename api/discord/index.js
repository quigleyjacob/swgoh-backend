import express from 'express'
import { getAccounts, getGuilds, getDefaultAccount, getDefaultGuild, getRoles, addRole, removeRole, registerUser, verifyUser, getGuildMemberDiscordRegistrations, getServerRegistrations, registerServer, unregisterServer, getActiveBuilds, authenticateUser, getDiscordAuthURL } from './discord.js'
let router = express.Router()

router.route('/user')
    .post(getAccounts)

router.route('/user/default')
    .post(getDefaultAccount)

router.route('/guild')
    .post(getGuilds)

router.route('/guild/default')
    .post(getDefaultGuild)

router.route('/guild/registration')
.post(getGuildMemberDiscordRegistrations)

router.route('/guild/role')
    .post(getRoles)

router.route('/guild/role/add')
    .post(addRole)

router.route('/guild/role/remove')
    .post(removeRole)

router.route('/register')
    .post(registerUser)

    router.route('/verify')
    .post(verifyUser)

router.route('/server/registration')
    .post(getServerRegistrations)

router.route('/server/register')
    .post(registerServer)

router.route('/server/unregister')
    .post(unregisterServer)

router.route('/server/build')
    .post(getActiveBuilds)

router.route('/authURL')
    .post(getDiscordAuthURL)

router.route('/authenticate')
    .post(authenticateUser)


export default router