import express from 'express'
const app = express()
const PORT = 8080
import { getCategoryList, getDetailedGuildData, getGuildData, getPlatoons, getPlayerData, refreshGuild, refreshLocalization, getUnitsMap, refreshUnits, getUnitImage, refreshImages } from './lib/database.js'
import { getCurrentGAC, test, getImage } from './lib/hu.js'
import Comlink from './lib/comlink.js'
import cors from 'cors'

app.use(cors())


app.get("/", (req, res) => {
    res.send('Hello world!')
})

app.get('/api/categories', async (req, res) => {
    res.send(await getCategoryList())    
})

app.get('/api/units', async (req, res) => {
    res.send(await getUnitsMap())
})

app.get('/api/refresh/localization', async (req, res) => {
    res.send(await refreshLocalization())
})

app.get('/api/refresh/units', async (req, res) => {
    res.send(await refreshUnits())
})

app.get('/api/player/:allyCode', async (req, res) => {
    let update = req.query.update == "true" ? true : false
    let projection = req.query.projection
    let allyCode = req.params.allyCode
    res.send(await getPlayerData(allyCode, update, projection))
})

app.get('/api/guild/:id', async (req, res) => {
    let update = req.query.update == "true" ? true : false
    let detailed = req.query.detailed == "true" ? true : false
    let id = req.params.id
    let projection = req.query.projection
    if(detailed) {
        res.send(await getDetailedGuildData(id, update, projection))
    } else {
        res.send(await getGuildData(id, update))
    }
})

app.get('/api/guild/update/:allyCode', async (req, res) => {
    let allyCode = req.params.allyCode
    res.send(await refreshGuild(allyCode))
})

app.get('/api/image/:baseId', async (req, res) => {
    let baseId = req.params.baseId
    res.send(await getUnitImage(baseId))
})

app.get('/api/platoon/:tb/:ls_phase/:mix_phase/:ds_phase', async (req, res) => {
    let tb = req.params.tb
    let ls_phase = Number(req.params.ls_phase)
    let mix_phase = Number(req.params.mix_phase)
    let ds_phase = Number(req.params.ds_phase)
    res.send(await getPlatoons(tb, ls_phase, mix_phase, ds_phase))
})

app.get('/api/gac/current', async (req, res) => {
    res.send(await getCurrentGAC())
})

app.get('/api/refresh/images', async (req, res) => {
    res.send(await refreshImages())
})

app.get('/test', async (req, res) => {
    // tex.charui_trooperclone_arc
    // tex.charui_doctoraphra
    // await getImage('tex.charui_b1commander')
    // .then(response => res.send(response))
    // .catch(err => res.send(err))
    res.send(await Comlink.getGuild('134232169'))
})

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`)
})