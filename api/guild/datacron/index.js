import express from 'express'
import { getDatacronTest, updateDatacronTest } from './datacron.js'


let router = express.Router({mergeParams: true})

router.route('/')
    .get(getDatacronTest)
    .put(updateDatacronTest)

export default router