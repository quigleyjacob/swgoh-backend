import express from 'express'
import { getAllSquads, addSquad, deleteSquad } from './squad.js'

let router = express.Router({mergeParams: true})

router.route('/')
    .get(getAllSquads)
    .post(addSquad)

router.route('/:id')
    .delete(deleteSquad)

export default router