import express from 'express'
import { addArena, removeArena, getArena, checkArena, getArenas } from './arena.js'

let router = express.Router()

router.route('/')
    .post(getArenas)

router.route('/add')
    .post(addArena)

router.route('/remove')
    .post(removeArena)

router.route('/get')
    .post(getArena)

router.route('/check')
    .post(checkArena)

export default router