import { handleDBError } from '../../../utils/error.js';
import Registry from '../../registry.js';
import Player from '../player/player.js';

class DiscordUser {
    async getAccountsByDiscordId(discordId) {
        let accounts = await Registry.getUserDiscordRegistrations(discordId)
        let allyCodes = accounts.map(account => account.allyCode)
        let accountsData
        try {
            accountsData = await Player.getPlayers(allyCodes, {_id: 0, allyCode: 1, name: 1, guildId: 1, guildName: 1})
        } catch(err) {
            throw handleDBError(err, 'Player', 'get')
        }
        let accountsMap = accountsData.reduce((map, obj) => (map[obj.allyCode] = obj, map), {})
        return accounts
        .map(account => {
            let accountData = accountsMap[account.allyCode]
            return {...account, ...accountData}
        })
        .sort((a,b) => a.primary ? -1 : b.primary ? 1 : (a.verified ? -1 : b.verified ? 1 : 0))
    }
}

export default new DiscordUser()