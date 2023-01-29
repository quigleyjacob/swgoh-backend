import DiscordOAuth2 from 'discord-oauth2'
import { config } from 'dotenv'
config()
import crypto from 'crypto'
import DB from './database.js'

class OAuth {

    constructor() {
        this.oauth = new DiscordOAuth2({
            clientId: process.env.DISCORD_CLIENT_ID,
            clientSecret: process.env.DISCORD_CLIENT_SECRET,
            redirectUri: 'http://localhost:3000/authenticate'
        })
        this.discord_url = 'https://discord.com/api/oauth2'
    }

    async getDiscordAuthURL() {
        let state = crypto.randomBytes(16).toString('base64')
        let url = this.oauth.generateAuthUrl({
            scope: 'identify',
            state: state
        })
        await DB.beginSession(state)
        return url
    }

    async authenticateUser(code, state) {
        await DB.verifySession(state)
        let tokenObject = await this.getToken(code)
        let token = tokenObject?.access_token
        let user = await this.getUser(token)
        await DB.authenticateSession(state, user)
        return state
    }

    /**
     * @param {string} code
     */
    async getToken(code) {
        try {
            let response = await this.oauth.tokenRequest({
                grantType: 'authorization_code',
                code: code,
                scope: 'identify'
            })
            return response
        } catch(err) {
            console.log(err.message)
        }

    }

    async getUser(token) {
        let user = await this.oauth.getUser(token)
        return user
    }
}

export default new OAuth()