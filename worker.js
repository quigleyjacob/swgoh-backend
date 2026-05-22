import { claimJob, updateJobProgress, completeJob, failJob } from './lib/jobQueue.js'
import Refresh from './lib/database/refresh.js'
import Player from './lib/database/player/player.js'
import Guild from './lib/database/guild/guild.js'
import { defaultPlayerProjection } from './utils/projections.js'

const POLL_INTERVAL_MS = Number(process.env.JOB_POLL_INTERVAL_MS || 5000)
const WORKER_ID = process.env.JOB_WORKER_ID || `worker-${process.pid}`
let running = true

process.on('SIGINT', () => {
  console.log('Worker shutting down...')
  running = false
})
process.on('SIGTERM', () => {
  console.log('Worker shutting down...')
  running = false
})

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function runGuildRefreshJob(job) {
  const payload = job.payload || {}
  const guildId = payload.guildId
  const detailed = payload.detailed || false
  const projection = payload.projection || defaultPlayerProjection

  console.log(`Processing guildRefresh job ${job._id} for guild ${guildId} detailed=${detailed}`)

  await updateJobProgress(job._id, 10, 'Starting guild refresh')
  const guildData = await Refresh.refreshGuild(guildId)
  await updateJobProgress(job._id, 20, `Guild refreshed (${guildData.member?.length || 0} members)`) // base guild refresh complete

  if (detailed) {
    const playerIds = (guildData.member || []).map(member => member.playerId)
    const total = playerIds.length

    const progressCallback = async (done, totalPlayers, id) => {
      const percent = 20 + Math.min(70, Math.floor((70 * done) / Math.max(totalPlayers, 1)))
      await updateJobProgress(job._id, percent, `Refreshing member ${done}/${totalPlayers}`)
    }

    if (total === 0) {
      await updateJobProgress(job._id, 90, 'No members to refresh')
    } else {
      await Player.getPlayers(playerIds, projection, 'playerId', true, false, progressCallback)
      await updateJobProgress(job._id, 90, 'Members refreshed, assembling detailed guild data')
    }

    // Fetch detailed guild data from DB so frontend can use it immediately
    let detailedGuildData = null
    try {
      detailedGuildData = await Guild.getGuild(guildId, false, true, defaultPlayerProjection)
      await updateJobProgress(job._id, 95, 'Detailed guild data assembled')
    } catch (err) {
      console.error('Failed to assemble detailed guild data:', err)
    }

    await updateJobProgress(job._id, 100, 'Detailed guild refresh complete')
    return {
      guildId,
      detailed: true,
      memberCount: total,
    //   guildData: detailedGuildData
    }
  }

  await updateJobProgress(job._id, 100, 'Guild refresh complete')
  return {
    guildId,
    detailed: false,
    memberCount: guildData.member?.length || 0
  }
}

async function processJob(job) {
  try {
    switch (job.type) {
      case 'guildRefresh':
        return await runGuildRefreshJob(job)
      default:
        throw new Error(`Unsupported job type [${job.type}]`)
    }
  } catch (err) {
    console.error(`Job ${job._id} failed`, err)
    const retry = job.attempts < (job.maxAttempts || 3)
    await failJob(job._id, err.message || 'Job failed', retry)
    if (!retry) {
      throw err
    }
  }
}

async function loop() {
  while (running) {
    const job = await claimJob(WORKER_ID)
    if (!job) {
      await sleep(POLL_INTERVAL_MS)
      continue
    }

    try {
      const result = await processJob(job)
      if (result) {
        await completeJob(job._id, result)
      }
    } catch (err) {
      console.error('Error processing job', err)
    }
  }
}

console.log(`Job worker started: ${WORKER_ID}`)
loop().catch(err => {
  console.error('Worker crashed', err)
  process.exit(1)
})
