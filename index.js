import express from 'express'
import expressOasGenerator from 'express-oas-generator'
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
import mhann from './lib/mhann.js'
import { processRequest, validateMhannResponse } from './lib/validation.js'

expressOasGenerator.init(app, {});

app.use(cors())
app.use(express.json({limit: '5mb'}))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))
app.use('/api', api)

app.get("/", async (req, res) => {
    res.send('Hello world!')
})

app.get('/token', async (req, res) => {
    await Refresh.refreshLocalization()
    res.send('hello from token')
})

// app.post('/test', async (req, res) => {
//     await refreshData()
//     res.send('done')
//     processRequest(res, async () => {
//         let response = await mhann._fetch(`/api/${req.query.endpoint}`, {
//             payload: {
//                 allyCode: '516893914',
//                 userDiscordId: '593451293352132625',
//                 enums: false
//             }
//         })
//         return validateMhannResponse(response, 'err message')
//     })
// })

expressOasGenerator.handleResponses(app);

async function refreshData() {
    console.log('Checking for new game data version')
    // let { newVersion, latestGamedataVersion, latestLocalizationBundleVersion } = await DB.newGameVersionAvailable()
    let [newVersion, latestGamedataVersion, latestLocalizationBundleVersion] = [true, undefined, undefined]
    if(newVersion) {
        try {
            await Refresh.refreshMetaData()
            await Refresh.refreshGameData(latestGamedataVersion)
            await Refresh.refreshLocalization(latestLocalizationBundleVersion)
            await Refresh.refreshActiveDatacrons()
            await Refresh.refreshActiveEra()
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