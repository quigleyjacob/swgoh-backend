import express from 'express'
import { getPlatoonData, computeIdealPlatoons } from './platoon.js'

let router = express.Router()

router.route('/')
    .post(getPlatoonData)

router.route('/ideal')
    .post(computeIdealPlatoons)

export default router