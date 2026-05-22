import express from 'express'
import { createJob, getJob, listJobs } from './jobs.js'
import { streamJob } from './jobs.js'

let router = express.Router()

router.route('/')
  .get(listJobs)
  .post(createJob)

router.route('/:jobId')
  .get(getJob)
router.route('/:jobId/stream')
  .get(streamJob)

export default router
