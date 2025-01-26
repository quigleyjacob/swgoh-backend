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

app.use(cors())
app.use(express.json({limit: '1mb'}))
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
    // await DB.refreshLocalization("jreuzGOKRPiRuBIhsqtu7Q")
// await refreshData()
    // let results = await getGacHistoryForGuild('nNv53ssBQhaKue5zstelFQ')
    // let results = await getGacHistoryForGauntlet()
    // await getGacHistoryForPlayer('wotzB4TRR7WbgBz2LJpCyg', "Boomer", "MAW CH")
//    res.send(results)
    // let members = await oauth.getServerMembers("Zem41vMHzMTuShVucfgr2oqb7qccte", "964016812792623134")
    // res.send(members)
    // await DB.refreshMetaData()
    // res.send('done')
    // res.send((await comlink.getGameData(1))["playerPortrait"])
    // await refreshData()
    // res.send(await comlink.getPlayerWithStats({allyCode: "487828531"}))
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