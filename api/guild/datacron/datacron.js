import Guild from '../../../lib/database/guild/guild.js'
import Session from '../../../lib/database/session.js'
import GuildDatacron from '../../../lib/database/guild/datacron.js'
import { MyError } from '../../../utils/error.js'
import { processRequest } from '../../../lib/validation.js'

export async function getDatacronTest(req, res) {
    let guildId = req.params.guildId
    let session = req.headers.session
    processRequest(res, async () => {
        if(session && !(await Session.sessionInGuild(session, guildId))) {
            throw new MyError(401, 'Session Id is not in guild')
        }
        if(!Guild.isGuildBuild(guildId)) {
            throw new MyError(401, 'Guild is not registered with the guild build.')
        }
        return GuildDatacron.getGuildDatacronTest(guildId)
    })
}

export async function updateDatacronTest(req, res) {
    let session = req.headers.session
    let guildId = req.params.guildId
    let tests = {...req.body, guildId}
    processRequest(res, async () => {
        if(session && !(await Session.sessionIsGuildOfficer(session, guildId))) {
            throw new MyError(401, 'Session Id is not a guild officer.')
        }
        if(!Guild.isGuildBuild(guildId)) {
            throw new MyError(401, 'Guild is not registered with the guild build.')
        }
        return GuildDatacron.updateGuildDatacronTest(tests)
    })
}