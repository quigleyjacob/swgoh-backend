import ApiSwgohHelp from 'api-swgoh-help'
import { config } from 'dotenv'
config()

export const swapi = new ApiSwgohHelp({
    'username': process.env.SWGOH_HELP_USERNAME,
    'password': process.env.SWGOH_HELP_PASSWORD
})