import express from 'express'
import { getLatestGacNumber } from './gac.js'

let router = express.Router()

router.route('/')
    .post((req, res) => {
        res.send('hello there')
    })

router.route('/latest')
    .post(getLatestGacNumber)

export default router