import { ObjectId } from 'mongodb'
import { connectToDatabase } from '../utils/mongodb.js'

const COLLECTION_NAME = 'jobs'
let indexesCreated = false

async function getCollection() {
  const { db } = await connectToDatabase()
  const collection = db.collection(COLLECTION_NAME)

  if (!indexesCreated) {
    await collection.createIndexes([
      { key: { type: 1, status: 1, priority: -1, createdAt: 1 } },
      { key: { status: 1, workerId: 1 } },
      { key: { 'payload.guildId': 1, status: 1 } },
      { key: { createdAt: 1 }, expireAfterSeconds: 60 * 60 * 24 * 14 }
    ])
    indexesCreated = true
  }

  return collection
}

function normalizeJob(job) {
  if (!job) {
    return null
  }
  return {
    ...job,
    _id: job._id?.toString?.(),
    createdAt: job.createdAt?.toISOString?.(),
    startedAt: job.startedAt?.toISOString?.(),
    finishedAt: job.finishedAt?.toISOString?.()
  }
}

export async function createJob(type, payload, options = {}) {
  const { priority = 0, maxAttempts = 3, uniqueFields = [] } = options
  const collection = await getCollection()

  if (uniqueFields.length > 0) {
    let duplicateFilter = {
      type,
      status: { $in: ['queued', 'running'] }
    }
    uniqueFields.forEach(field => {
      duplicateFilter[`payload.${field}`] = payload[field]
    })
    const existing = await collection.findOne(duplicateFilter)
    if (existing) {
      return normalizeJob(existing)
    }
  }

  const now = new Date()
  const job = {
    type,
    payload,
    status: 'queued',
    priority,
    progress: 0,
    message: 'queued',
    attempts: 0,
    maxAttempts,
    createdAt: now,
    updatedAt: now
  }

  const result = await collection.insertOne(job)
  return normalizeJob({ ...job, _id: result.insertedId })
}

export async function claimJob(workerId, filter = {}) {
  const collection = await getCollection()
  const now = new Date()
  const query = {
    status: 'queued',
    ...filter
  }

  const update = {
    $set: {
      status: 'running',
      workerId,
      startedAt: now,
      updatedAt: now,
      message: 'running'
    },
    $inc: {
      attempts: 1
    }
  }

  const result = await collection.findOneAndUpdate(query, update, {
    sort: { priority: -1, createdAt: 1 },
    returnDocument: 'after'
  })

  return result.value
}

export async function updateJobProgress(jobId, progress, message = undefined) {
  const collection = await getCollection()
  const update = {
    $set: {
      updatedAt: new Date(),
      progress: Math.min(100, Math.max(0, progress))
    }
  }
  if (message !== undefined) {
    update.$set.message = message
  }

  await collection.updateOne({ _id: new ObjectId(jobId) }, update)
}

export async function completeJob(jobId, result = {}) {
  const collection = await getCollection()
  await collection.updateOne(
    { _id: new ObjectId(jobId) },
    {
      $set: {
        status: 'completed',
        progress: 100,
        message: 'completed',
        result,
        finishedAt: new Date(),
        updatedAt: new Date()
      }
    }
  )
}

export async function failJob(jobId, errorMessage, retry = false) {
  const collection = await getCollection()
  const job = await collection.findOne({ _id: new ObjectId(jobId) })
  if (!job) {
    return
  }

  const nextStatus = retry && job.attempts < job.maxAttempts ? 'queued' : 'failed'
  const update = {
    $set: {
      status: nextStatus,
      message: errorMessage,
      error: errorMessage,
      updatedAt: new Date()
    }
  }

  if (nextStatus === 'failed') {
    update.$set.finishedAt = new Date()
  }

  await collection.updateOne({ _id: new ObjectId(jobId) }, update)
}

export async function getJob(jobId) {
  const collection = await getCollection()
  if (!ObjectId.isValid(jobId)) {
    return null
  }
  const job = await collection.findOne({ _id: new ObjectId(jobId) })
  return normalizeJob(job)
}

export async function listJobs(filter = {}, limit = 50) {
  const collection = await getCollection()
  const query = { ...filter }
  const jobs = await collection.find(query).sort({ createdAt: -1 }).limit(limit).toArray()
  return jobs.map(normalizeJob)
}
