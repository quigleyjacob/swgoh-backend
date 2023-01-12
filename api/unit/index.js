import express from 'express'
import { getUnitsMap } from './unit.js'

let router = express.Router()

router.route('/')
    .post(getUnitsMap)

export default router