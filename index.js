import express from 'express'
const app = express()
const PORT = 8080
import cors from 'cors'
import api from './api/index.js'

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use('/api', api)

app.get("/", async (req, res) => {
    res.send('Hello world!')
})

app.get('/token', (req, res) => {
    res.send('hello from token')
})

app.post('/test', async (req, res) => {
    res.send('testing route')
})

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`)
})