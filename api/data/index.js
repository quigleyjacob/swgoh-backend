import express from 'express'
import { getSkills, getData } from './data.js'

let router = express.Router()

router.route('/')
    .post(getData)

router.route('/skill')
    .post(getSkills)

export default router