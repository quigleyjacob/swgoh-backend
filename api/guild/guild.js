import Guild from '../../lib/database/guild/guild.js'
import Session from '../../lib/database/session.js'
import { MyError } from '../../utils/error.js'
import { processRequest } from '../../lib/validation.js'

export async function getGuild(req, res) {
    let refresh = req.body.refresh ? true : false
    let detailed = req.body.detailed ? true : false
    let guildId = req.body.guildId
    let projection = req.body.projection || {name: 1, allyCode: 1, playerId: 1}
    processRequest(res, () => Guild.getGuild(guildId, refresh, detailed, projection))
}

export async function isGuildBuild(req, res) {
    let guildId = req.params.guildId
    let session = req.headers.session
    processRequest(res, async () => {
        if(session && !(await Session.sessionInGuild(session, guildId))) {
            throw new MyError(401, 'Session Id is not in guild.')
        }
        return Guild.isGuildBuild(guildId)
    })
}