import express from 'express'
import { getAccounts, deployOperations, getSettings, updateSettings, getCommandOptions, getOperationOptions, getGacBoard } from './user.js'

let router = express.Router({mergeParams: true})

router.route('/')
    .get(getAccounts)

router.route('/operation/deploy')
    .post(deployOperations)

router.route('/settings')
    .get(getSettings)
    .post(updateSettings)

router.route('/command')
    .get(getCommandOptions)

router.route('/operation')
    .get(getOperationOptions)

router.route('/gac')
    .get(getGacBoard)

export default router