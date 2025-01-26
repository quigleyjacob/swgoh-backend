import express from 'express'
import { getServerRegistrations } from './build.js'

let router = express.Router({mergeParams: true})

router.route('/')
    .get(getServerRegistrations)

export default router