import express from 'express'
import { getCategoryList } from './category.js'

let router = express.Router()

router.route('/')
    .post(getCategoryList)

export default router