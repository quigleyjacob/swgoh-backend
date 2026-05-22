import { createJob as createJobRecord, getJob as getJobRecord, listJobs as listJobRecords } from '../../lib/jobQueue.js'
import { processRequest } from '../../lib/validation.js'

function normalizeResponse(job) {
  if (!job) return null
  return {
    id: job._id,
    type: job.type,
    status: job.status,
    progress: job.progress,
    message: job.message,
    payload: job.payload,
    result: job.result || null,
    error: job.error || null,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt
  }
}

function progressResponse(job) {
  if (!job) return { error: 'job-not-found' }
  return {
    id: job._id,
    status: job.status,
    progress: job.progress,
    message: job.message,
    error: job.error || null,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt
  }
}

export async function createJob(req, res) {
  const { type, payload, options } = req.body
  processRequest(res, async () => {
    const job = await createJobRecord(type, payload, options)
    return normalizeResponse(job)
  })
}

export async function getJob(req, res) {
  const jobId = req.params.jobId
  processRequest(res, async () => {
    const job = await getJobRecord(jobId)
    return normalizeResponse(job)
  })
}

export async function listJobs(req, res) {
  const filter = {}
  if (req.query.type) filter.type = req.query.type
  if (req.query.status) filter.status = req.query.status
  processRequest(res, async () => {
    const jobs = await listJobRecords(filter)
    return jobs.map(normalizeResponse)
  })
}

// Server-Sent Events stream for job updates. Uses query param `session` for auth if needed.
export async function streamJob(req, res) {
  const jobId = req.params.jobId

  // set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  })
  res.flushHeaders()
  res.write(': connected\n\n')

  let closed = false
  req.on('close', () => {
    closed = true
  })

  const send = (obj) => {
    try {
      res.write(`data: ${JSON.stringify(obj)}\n\n`)
    } catch (e) {
      // ignore
    }
  }

  // initial send
  try {
    const job = await getJobRecord(jobId)
    send(progressResponse(job))
  } catch (err) {
    send({ error: 'unable to retrieve job' })
  }

  // poll and stream updates until job completes or client disconnects
  const interval = setInterval(async () => {
    if (closed) {
      clearInterval(interval)
      return
    }
    try {
      const job = await getJobRecord(jobId)
      if (!job) {
        send({ error: 'job-not-found' })
        clearInterval(interval)
        res.end()
        return
      }
      send(progressResponse(job))
      if (job.status === 'completed' || job.status === 'failed') {
        clearInterval(interval)
        res.end()
      }
    } catch (err) {
      send({ error: 'stream-error' })
      clearInterval(interval)
      res.end()
    }
  }, Number(process.env.JOB_STREAM_INTERVAL_MS || 1000))
}
