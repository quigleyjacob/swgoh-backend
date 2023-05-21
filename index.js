import express from 'express'
const app = express()
const PORT = process.env.PORT || 8080
import cors from 'cors'
import api from './api/index.js'
import oauth from './lib/oauth.js'

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
    let members = await oauth.getServerMembers("Zem41vMHzMTuShVucfgr2oqb7qccte", "964016812792623134")
    res.send(members)
})

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`)
})