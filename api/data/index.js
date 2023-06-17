import express from 'express'
import { getSkills, getData, getPortrait, getPortraits } from './data.js'

let router = express.Router()

router.route('/')
    .post(getData)

router.route('/skill')
    .post(getSkills)

router.route('/portrait')
    .get(getPortraits)
    .post(getPortrait)

export default router