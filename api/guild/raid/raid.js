import Mhann from '../../../lib/mhann.js'
import { processRequest } from '../../../lib/validation.js'
import Session from '../../../lib/database/session.js'
import Guild from '../../../lib/database/guild/guild.js'
import { MyError } from '../../../utils/error.js'
import Raid from '../../../lib/database/guild/raid.js'

export async function getActiveRaid(req, res) {
    let allyCode = req.query.allyCode
    let guildId = req.params.guildId
    let session = req.headers.session
    let refresh = req.query.refresh === 'true'
    processRequest(res, async () => {
        if(allyCode === undefined) {
            throw new MyError(400, 'Ally code is required')
        }
        if(session && !(await Session.sessionInGuild(session, guildId, allyCode))) {
            throw new MyError(401, 'Session Id is not present in guild')
        }
        if(!Guild.isGuildBuild(guildId)) {
            throw new MyError(401, 'Guild is not registered with the guild build.')
        }
        let discordId = session ? await Session.sessionToDiscord(session).then(discord => discord.id) : null
        return Raid.getActiveRaid(allyCode, guildId, discordId, refresh)
    })
}