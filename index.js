import express from 'express'
const app = express()
const PORT = process.env.PORT || 8080
import cors from 'cors'
import api from './api/index.js'
import oauth from './lib/oauth.js'
import DB from './lib/database.js'
import { CronJob } from 'cron'

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
//    res.send('test')
    // let members = await oauth.getServerMembers("Zem41vMHzMTuShVucfgr2oqb7qccte", "964016812792623134")
    // res.send(members)
    // await DB.refreshMetaData()
    res.send('done')
})

async function startRefreshJob() {
    let job = new CronJob('0 0 0 * * *', async () => { //occurs at midnight
        console.log('Checking for new game data version')
        let { newVersion, latestGamedataVersion, latestLocalizationBundleVersion } = await DB.newGameVersionAvailable()
        if(newVersion) {
            try {
                console.log(`New game version found [latestGamedataVersion = ${latestGamedataVersion}, latestLocalizationBundleVersion = ${latestLocalizationBundleVersion}]`)
                console.log('Retrieving new game data.')
                await DB.refreshMetaData()
                console.log("Refreshing localization data")
                await DB.refreshLocalization(latestLocalizationBundleVersion)
                console.log('Refreshing units data')
                await DB.refreshUnits(latestGamedataVersion)
                console.log('Refreshing unit skills and categories')
                await DB.refreshSkills(latestGamedataVersion)
                console.log('Refreshing battle targeting rules')
                await DB.refreshBattleTargetingRule(latestGamedataVersion)
                console.log('Data refresh complete!')
            } catch(err) {
                console.log(err)
            }
        } else {
            console.log('No new game data version, exiting')
        }
    })
    job.start()
}


app.listen(PORT, () => {
    startRefreshJob()
    console.log(`Listening on port ${PORT}`)
})