import express from 'express'
import { getDefenses, addDefense, getDefense, updateDefense, deleteDefense } from './defense.js'

let router = express.Router({mergeParams: true})

router.route('/')
    .get(getDefenses)
    .post(addDefense)
    
router.route('/:id')
    .get(getDefense)
    .put(updateDefense)
    .delete(deleteDefense)

export default router