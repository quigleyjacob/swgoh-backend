import dotenv from 'dotenv'
dotenv.config()
import Session from '../lib/database/session.js'

export async function validate(req, res, next) {
    let discordKey = req.headers['discord-api-key']
    let apiKey = req.headers['api-key']
    let session = req.headers.session
    let url = req.originalUrl
    try {
        if(url === '/api/discord/authURL' || url === '/api/discord/authenticate') { //session is created from this route
            next()
        }
         else if(url.startsWith('/api/data') || url === '/api/player' || url === '/api/player/arena' || url === '/api/guild' || (url.startsWith('/api/leaderboard') && req.method === 'GET')) { // public data
            next()
        }
        else if(discordKey && discordKey === process.env.DISCORD_API_KEY) {
            next()
        }
        else if(isScubaCall(url, req.method, apiKey)) {
            next()
        }
        else if(session && await Session.verifySessionComplete(session)) {
            let expiration = await Session.getSessionExpiration(session)
            if(expiration - new Date() <= 0) {
                res.status(403).end('Your session has expired. Please logout and sign in again.')
                return
            }
            next()
        } else {
            res.status(401).end('You do not have permission to perform this action.')
        }
    } catch (err) {
        res.status(401).end('You do not have permission to perform this action.')
    }

}

function isScubaCall(url, method, apiKey) {
    return /^\/api\/player\/\d{9}\/gac\/board/g.test(url)
    && method === 'POST'
    && apiKey === process.env.SCUBA_API_KEY
}