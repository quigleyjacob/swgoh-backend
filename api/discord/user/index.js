import express from 'express'
import { getAccounts } from './user.js'

let router = express.Router({mergeParams: true})

router.route('/')
    .get(getAccounts)

export default router