import express from 'express'
import { getAccounts, deployOperations, getSettings, updateSettings } from './user.js'

let router = express.Router({mergeParams: true})

router.route('/')
    .get(getAccounts)

router.route('/operation/deploy')
    .post(deployOperations)

router.route('/settings')
    .get(getSettings)
    .post(updateSettings)

export default router