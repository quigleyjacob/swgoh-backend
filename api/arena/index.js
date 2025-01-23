import express from 'express'
import { addArena, removeArena, getArena, checkArenas } from './arena.js'

let router = express.Router()

router.route('/')
    .get(checkArenas)
    .post(addArena)

router.route('/:allyCode')
    .get(getArena)
    .delete(removeArena)

export default router