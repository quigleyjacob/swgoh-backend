import express from 'express'
import { getRoles, addRole, removeRole } from './role.js'

let router = express.Router({mergeParams: true})

router.route('/')
    .get(getRoles)
    .post(addRole)

router.route('/:roleId')
    .delete(removeRole)

export default router