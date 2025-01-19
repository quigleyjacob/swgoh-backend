import dotenv from 'dotenv'
dotenv.config()
import DB from '../lib/database.js'

export async function validate(req, res, next) {
    let discordKey = req.body.discordKey
    let session = req.body.session || req.headers.session
    let url = req.originalUrl
    try {
        if(url === '/api/discord/authURL' || url === '/api/discord/authenticate') { //session is created from this route
            next()
        }
         else if(url.startsWith('/api/data') || url === '/api/player' || url === '/api/guild' || url === '/api/leaderboard' || url === '/api/leaderboard/accounts') { // public data
            next()
        }
        else if(discordKey && discordKey === process.env.DISCORD_API_KEY) {
            next()
        }
        else if(session && await DB.verifySessionComplete(session)) {
            let expiration = await DB.getSessionExpiration(session)
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