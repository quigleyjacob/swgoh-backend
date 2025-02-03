import express from 'express'
const app = express()
const PORT = process.env.PORT || 8080
import cors from 'cors'
import api from './api/index.js'
import oauth from './lib/oauth.js'
import DB from './lib/database/database.js'
import { CronJob } from 'cron'
import comlink from './lib/comlink.js'
import { getGacHistoryForGauntlet, } from './lib/gacHistory.js'
import Refresh from './lib/database/refresh.js'
import Data from './lib/database/data.js'
import { connectToDatabase } from './utils/mongodb.js'

app.use(cors())
app.use(express.json({limit: '5mb'}))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))
app.use('/api', api)

app.get("/", async (req, res) => {
    res.send('Hello world!')
})

app.get('/token', (req, res) => {
    res.send('hello from token')
})

app.post('/test', async (req, res) => {
    // await refreshData()
    // res.send('done')
})

async function refreshData() {
    console.log('Checking for new game data version')
    let { newVersion, latestGamedataVersion, latestLocalizationBundleVersion } = await DB.newGameVersionAvailable()
    if(newVersion) {
        try {
            await Refresh.refreshGameData(latestGamedataVersion)
            await Refresh.refreshLocalization(latestLocalizationBundleVersion)
            await Refresh.refreshActiveDatacrons()
        } catch(err) {
            console.log(err)
        }
    } else {
        console.log('No new game data version, exiting')
    }
}

async function startRefreshJob() {
    let job = new CronJob('0 0 0 * * *', refreshData)
    job.start()
}


app.listen(PORT, () => {
    startRefreshJob()
    console.log(`Listening on port ${PORT}`)
})