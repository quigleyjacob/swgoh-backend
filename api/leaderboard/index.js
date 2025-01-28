import express from 'express'
import { setLeaderboard, addAccountToLeaderboard, removeAccountFromLeaderboard, getLeaderboard, getLeaderboards, unsetLeaderboard } from './leaderboard.js'

let router = express.Router()

router.route('/')
    .get(getLeaderboards)

router.route('/:id')
    .get(getLeaderboard)
    .post(setLeaderboard)
    .delete(unsetLeaderboard)

router.route('/:id/:allyCode')
    .post(addAccountToLeaderboard)
    .delete(removeAccountFromLeaderboard)

export default router