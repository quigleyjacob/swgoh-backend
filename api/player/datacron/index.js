import express from 'express'
import { getDatacronNames, updateDatacronNames } from './datacron.js'

let router = express.Router({mergeParams: true})

router.route('/')
    .get(getDatacronNames)
    .post(updateDatacronNames)

export default router