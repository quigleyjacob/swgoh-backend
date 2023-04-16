import express from 'express'
import { getActiveDatacrons } from './datacron.js'

let router = express.Router()

router.route('/active')
    .post(getActiveDatacrons)

export default router