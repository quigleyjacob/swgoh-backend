import express from 'express'
const app = express()
const PORT = 8080
import cors from 'cors'
import api from './api/index.js'

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use('/api', api)

app.get("/", (req, res) => {
    res.send('Hello world!')
})

// app.get('/api/gac/current', async (req, res) => {
//     res.send(await getCurrentGAC())
// })

app.post('/test', async (req, res) => {
    // tex.charui_trooperclone_arc
    // tex.charui_doctoraphra
    // await getImage('tex.charui_b1commander')
    // .then(response => res.send(response))
    // .catch(err => res.send(err))
    // try {
    //     let response = await Comlink.getPlayer({allyCode: '13423169'})
    //     res.send(response)
    // } catch(err) {
    //     // console.log(await err.cause.text())
    //     res.status(err.status).send(await err.cause.json())
    // }
    // processRequest(res, () => Comlink.getUnits())
    res.send('testing route')
})

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`)
})