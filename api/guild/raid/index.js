import express from 'express'
import { getActiveRaid } from './raid.js'


let router = express.Router({mergeParams: true})

router.route('/')
    .get(getActiveRaid)

export default router