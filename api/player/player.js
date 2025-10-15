import Player from '../../lib/database/player/player.js'
import PlayerArena from '../../lib/database/player/playerArena.js'
import DiscordUser from '../../lib/database/discord/user.js'
import Session from '../../lib/database/session.js'
import { MyError } from '../../utils/error.js'
import { processRequest } from '../../lib/validation.js'
import { defaultPlayerArenaProjection, defaultPlayerProjection } from '../../utils/projections.js'

export async function getPlayer(req, res) {
    let refresh = req.body.refresh ? true : false
    let projection = req.body.projection || defaultPlayerProjection
    let payload = req.body.payload
    processRequest(res, () => Player.getPlayer(payload, refresh, projection))
}

export async function getAccounts(req, res) {
    let session = req.headers.session
    let discordId = (await Session.sessionToDiscord(session)).id
    processRequest(res, () => DiscordUser.getAccountsByDiscordId(discordId))
}

export async function getPlayerArena(req, res) {
    let allyCodeArray = req.body.allyCodeArray
    let projection = req.body.projection || defaultPlayerArenaProjection
    processRequest(res, () => PlayerArena.getPlayerArenas(allyCodeArray, projection))
}



export async function getAuthStatus(req, res) {
    let session = req.headers.session
    let allyCode = req.headers.allycode
    processRequest(res, async () => {
        if(session && !(await Session.sessionIsPlayer(session, allyCode))) {
            throw new MyError(401, 'Session Id is not player')
        }
        return Player.getAuthStatus(session, allyCode)
    })
}