import dotenv from 'dotenv'
dotenv.config()
import DB from '../lib/database.js'

export async function validate(req, res, next) {
    let discordKey = req.body.discordKey
    let session = req.body.session
    if(discordKey && discordKey === process.env.DISCORD_API_KEY) {
        next()
    } else if(session && await DB.verifySessionComplete(session)) {
        next()
    } else {
        res.status(401).end('You do not have permission to perform this action.')
    }
}