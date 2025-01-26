import { connectToDatabase } from '../../../utils/mongodb.js'
import { handleDBError } from '../../../utils/error.js'
import Refresh from '../refresh.js'
import Session from '../session.js'
import Mhann from '../../mhann.js'

class Player {
    async getPlayer(payload, refresh, projection = defaultPlayerProjection) {
        const { db } = await connectToDatabase()
        if (refresh) {
            return await Refresh.refreshPlayer(payload, projection)
        }
        let response = await db.collection('player').findOne(payload, {projection: projection})
        if (!response) {
            console.log('player not found, refreshing')
            return await Refresh.refreshPlayer(payload, projection)
        }
        delete response.playerId
        return response
    }

    async getPlayers(array, projection = defaultPlayerProjection, key='allyCode', refresh = false, ignoreMissing = false) {
        const { db } = await connectToDatabase()
        projection[key] = 1
        try {
            if(refresh) {
                return await Refresh.refreshPlayers(array, projection, key)
            }
            let filter = {[key]: {$in: array}}
            let response = await db.collection('player').find(filter, {projection}).toArray()

            let found = response.map(account => account[key])
            let remaining = array.filter(id => !found.includes(id))
            if(ignoreMissing || remaining.length === 0) {
                return response
            }else {
                console.log(`missing accounts: ${remaining.length} [${remaining.join(',')}]`)
                let refreshedPlayers = await Refresh.refreshPlayers(remaining, projection, key)
                return [...response, ...refreshedPlayers]
            }
        } catch(err) {
            throw handleDBError(err, 'Player', 'get')
        }
    }

    async getGameConnection(session, allyCode) {
        const { db } = await connectToDatabase()
        let discordId = (await Session.sessionToDiscord(session)).id
        let response
        try {
            response = await db.collection('gameConnection').findOne({allyCode: allyCode, discordId: discordId})
        } catch(err) {
            handleDBError(err, 'gameConnection', 'get')
        }
        return response
    }

    async getAuthStatus(session, allyCode) {
        let count = (await this.getGameConnection(session, allyCode)).length
        if(count > 0) {
            return 'Success - Eligible for 3rd party authentication.'
        }

        return Mhann.getUserAuthStatus(allyCode)
    }
}

export default new Player()