import express from 'express'
import { addCommand, deleteCommand, getCommand, getCommands, updateCommand } from './command.js'

let router = express.Router({mergeParams: true})

router.route('/')
    .get(getCommands)
    .post(addCommand)

router.route('/:id')
    .get(getCommand)
    .put(updateCommand)
    .delete(deleteCommand)

export default router