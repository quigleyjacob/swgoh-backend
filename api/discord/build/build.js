import Build from '../../../lib/database/discord/build.js'
import { processRequest } from '../../../lib/validation.js'

export async function getServerRegistrations(req, res) {
    let build = req.params.build
    processRequest(res, () => Build.getServerRegistrations(build))
}