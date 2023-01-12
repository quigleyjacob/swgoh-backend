import express from 'express'
import { getPlatoonData } from './platoon.js'

let router = express.Router()

router.route('/')
    .post(getPlatoonData)

export default router