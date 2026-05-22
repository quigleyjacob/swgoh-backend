import { processRequest } from '../../lib/validation.js'
import { createJob } from '../../lib/jobQueue.js'
import { defaultPlayerProjection, defaultGuildProjection } from '../../utils/projections.js'

export async function refreshGuildJob(req, res) {
  const guildId = req.body.guildId
  const detailed = req.body.detailed ? true : false
  const projection = req.body.projection || defaultGuildProjection
  const playerProjection = req.body.playerProjection || defaultPlayerProjection

  processRequest(res, async () => {
    const job = await createJob(
      'guildRefresh',
      { guildId, detailed, projection, playerProjection },
      { uniqueFields: ['guildId'], priority: detailed ? 1 : 0 }
    )
    return {
      id: job._id,
      status: job.status,
      progress: job.progress,
      message: job.message
    }
  })
}
