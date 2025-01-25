import express from 'express'
import { getGacs, getCurrentGACBoard, getGac, addGac, updateGac, deleteGac, getLatestBracketResults } from './gac.js'

let router = express.Router({mergeParams: true})

router.route('/')
    .get(getGacs)
    .post(addGac)

router.route('/board')
    .get(getCurrentGACBoard)

router.route('/review')
    .get(getLatestBracketResults)

router.route('/:id')
    .get(getGac)
    .put(updateGac)
    .delete(deleteGac)

export default router