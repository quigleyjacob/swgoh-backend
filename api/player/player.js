import DB from '../../lib/database.js'
import { MyError } from '../../lib/error.js'
import { processRequest } from '../../lib/validation.js'

export async function getPlayerData(req, res)  {
    let refresh = req.body.refresh ? true : false
    let projection = req.body.projection
    let payload = req.body.payload
    processRequest(res, () => DB.getPlayerData(payload, refresh, projection))
}

export async function getAllGAC(req, res) {
    let session = req.body.session
    let allyCode = req.body.allyCode
    processRequest(res, async() => {
        if(session && !(await DB.sessionIsPlayer(session, allyCode))) {
            throw new MyError(401, 'Session Id is not player')
        }
        return DB.getAllGAC(allyCode)
    })
}

export async function addGAC(req, res) {
    let session = req.body.session
    let id = req.body.id
    let gac = req.body.gac
    
    processRequest(res, async () => {
        if(session && !(await DB.sessionIsPlayer(session, gac.player.allyCode))) {
            throw new MyError(401, 'Session Id is not player')
        }
        return DB.addGAC(id, gac)
})
}