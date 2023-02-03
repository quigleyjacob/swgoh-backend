import express from 'express'
import { getUnitImage, getImages } from './image.js'

let router = express.Router()

router.route('/:baseId')
    .get(getUnitImage)

router.route('/')
    .post(getImages)

export default router