import express from 'express'
import { getTasks } from './task.js'

let router = express.Router()

router.route('/')
    .post(getTasks)

export default router