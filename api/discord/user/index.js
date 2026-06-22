import express from 'express'
import { getAccounts, deployOperations } from './user.js'

let router = express.Router({mergeParams: true})

router.route('/')
    .get(getAccounts)

router.route('/operation/deploy')
    .post(deployOperations)

export default router