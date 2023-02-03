import express from 'express'
import { getSkills } from './data.js'

let router = express.Router()

router.route('/skill')
    .post(getSkills)

export default router