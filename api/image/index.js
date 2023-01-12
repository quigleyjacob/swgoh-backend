import express from 'express'
import { getUnitImage } from './image.js'

let router = express.Router()

router.route('/:baseId')
    .post(getUnitImage)

export default router