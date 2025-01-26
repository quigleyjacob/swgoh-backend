import { handleDBError } from '../../../../utils/error.js'
import Guild from '../../guild/guild.js'
import Registry from '../../../registry.js'

class DiscordGuild {
    async getGuildMemberDiscordRegistrations(guildId) {
        let guild = await Guild.getGuild(guildId)
        let guildAllyCodes = guild.member.map(member => member.allyCode)

        let discordRegistrations
        try {
            discordRegistrations = await Registry.getGuildDiscordRegistrations(guildAllyCodes)
        } catch(err) {
            throw handleDBError(err, 'Guild Member Registrations', 'get')
        }
        return discordRegistrations
    }
}

export default new DiscordGuild()