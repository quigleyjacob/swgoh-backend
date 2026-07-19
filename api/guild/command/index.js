import express from 'express'
import { addCommand, deleteCommand, getCommand, getCommands, updateCommand, postCommandsInGameById, postCommandsInGame } from './command.js'

let router = express.Router({mergeParams: true})

router.route('/')
    .get(getCommands)
    .post(addCommand)

router.route('/:id')
    .get(getCommand)
    .put(updateCommand)
    .delete(deleteCommand)

router.route('/:id/execute')
    .post(postCommandsInGameById)

router.route('/execute')
    .post(postCommandsInGame)

export default router