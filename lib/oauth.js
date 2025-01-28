// @ts-nocheck
import DiscordOAuth2 from 'discord-oauth2'
import { config } from 'dotenv'
config()
import crypto from 'crypto'
import Session from './database/session.js'

class OAuth {

    constructor() {
        this.oauth = new DiscordOAuth2({
            clientId: process.env.DISCORD_CLIENT_ID,
            clientSecret: process.env.DISCORD_CLIENT_SECRET,
            redirectUri: process.env.REACT_APP_REDIRECT_URL
        })
        this.discord_url = 'https://discord.com/api/oauth2'
    }

    async getDiscordAuthURL(redirectUri) {
        let state = crypto.randomBytes(16).toString('base64')
        let url = this.oauth.generateAuthUrl({
            scope: ['identify'],
            state: state,
            redirectUri: redirectUri
        })
        await Session.beginSession(state)
        return url
    }

    async authenticateUser(code, state, redirectUri) {
        await Session.verifySessionIncomplete(state)
        let tokenObject = await this.getToken(code, redirectUri)
        let token = tokenObject?.access_token
        let user = await this.getUser(token)
        return await Session.authenticateSession(state, user, tokenObject)
    }

    /**
     * @param {string} code
     */
    async getToken(code, redirectUri) {
        try {
            let response = await this.oauth.tokenRequest({
                grantType: 'authorization_code',
                code: code,
                scope: 'identify',
                redirectUri: redirectUri
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