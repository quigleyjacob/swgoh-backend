import express from 'express'
const app = express()
const PORT = process.env.PORT || 8080
import cors from 'cors'
import api from './api/index.js'

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use('/api', api)

app.get("/", async (req, res) => {
    console.log(req.get('host'))
    res.send('Hello world!')
})

app.get('/token', (req, res) => {
    console.log(req.originalUrl)
    res.send('hello from token')
})

app.post('/test', async (req, res) => {
    res.send('testing route')
})

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`)
})