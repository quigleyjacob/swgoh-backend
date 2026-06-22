import express from 'express'
import { addOperation, deleteOperation, computeIdealPlatoons, getOperation, getOperations, getOperationComputedByMessage, updateOperation, updateOperationComputeWithMessages, updateOperationComputeWithDirectMessages } from './operation.js'


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

router.route('/message')
    .patch(updateOperationComputeWithMessages)

router.route('/message/direct')
    .patch(updateOperationComputeWithDirectMessages)

router.route('/message/find')
    .post(getOperationComputedByMessage)

export default router