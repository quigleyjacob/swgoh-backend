import express from 'express'
import { addOperation, deleteOperation, computeIdealPlatoons, getOperation, getOperations, updateOperation } from './operation.js'


let router = express.Router({mergeParams: true})

router.route('/')
    .get(getOperations)
    .post(addOperation)

router.route('/:id')
    .get(getOperation)
    .put(updateOperation)
    .delete(deleteOperation)

router.route('/ideal')
    .post(computeIdealPlatoons)

export default router