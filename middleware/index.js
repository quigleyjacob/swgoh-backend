import dotenv from 'dotenv'
dotenv.config()
import DB from '../lib/database.js'

export async function validate(req, res, next) {
    let discordKey = req.body.discordKey
    let session = req.body.session
    let url = req.originalUrl
    if(url === '/api/discord/authURL' || url === '/api/discord/authenticate') { //session is created from this route
        next()
    } else if(url = '/api/data') { // public data
        next()
    } else if(discordKey && discordKey === process.env.DISCORD_API_KEY) {
        next()
    } else if(session && await DB.verifySessionComplete(session)) {
        next()
    } else {
        res.status(401).end('You do not have permission to perform this action.')
    }
}