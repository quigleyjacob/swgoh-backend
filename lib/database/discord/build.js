import { connectToDatabase } from '../../../utils/mongodb.js'
import { handleDBError } from '../../../utils/error.js';

class Build {
    async getServerRegistrations(build) {
        const { db } = await connectToDatabase()
        let serverRegistrations
        try {
            serverRegistrations = await db.collection('serverRegistration').find({build}).toArray()
        } catch(err) {
            throw handleDBError(err, 'Server Registration', 'get')
        }
        return serverRegistrations
    }
}

export default new Build()