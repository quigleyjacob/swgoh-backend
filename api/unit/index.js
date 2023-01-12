import express from 'express'
import { getPlayableUnits, getUnitsMap } from './unit.js'

let router = express.Router()

router.route('/')
    .post(getUnitsMap)

router.route('/playable')
    .post(getPlayableUnits)

export default router