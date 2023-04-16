import express from 'express'
import { getCategoryList, getVisibleCategoryList } from './category.js'

let router = express.Router()

router.route('/')
    .post(getCategoryList)

router.route('/visible')
    .post(getVisibleCategoryList)

export default router