import express from 'express'
import { setLeaderboard, addAccountToLeaderboard, removeAccountFromLeaderboard, getLeaderboard, getAccountsFromAllyCodeArray, refreshAccountsInLeaderboard, getLeaderboards, unsetLeaderboard } from './leaderboard.js'

let router = express.Router()

router.route('/all')
    .post(getLeaderboards)

router.route('/')
    .post(getLeaderboard)

router.route('/set')
    .post(setLeaderboard)

router.route('/unset')
    .post(unsetLeaderboard)

router.route('/add')
    .post(addAccountToLeaderboard)

router.route('/remove')
    .post(removeAccountFromLeaderboard)

router.route('/accounts')
    .post(getAccountsFromAllyCodeArray)

router.route('/refresh')
    .post(refreshAccountsInLeaderboard)

export default router