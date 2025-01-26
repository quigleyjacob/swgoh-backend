import { connectToDatabase } from '../../../../utils/mongodb.js'
import { handleDBError, MyError } from '../../../../utils/error.js'

class Role {
    async getRoles(guildId) {
        const { db } = await connectToDatabase()

        let roles
        try {
            roles = await db.collection('discord_role').find({guildId}).toArray()
        } catch(err) {
            throw handleDBError(err, 'Guild Roles', 'get')
        }
        return roles
    }

    async addRole(role) {
        const { db } = await connectToDatabase()

        try {
            await db.collection('discord_role').insertOne(role)
        } catch (err) {
            throw handleDBError(err, 'Guild Role', 'add')
        }
        return `Role [id=${role.roleId}] added to the database`
    }

    async removeRole(roleId, guildId) {
        const { db } = await connectToDatabase()

        try {
            let response = await db.collection('discord_role').deleteOne({roleId, guildId})
            if(response.deletedCount === 0) {
                throw new MyError(400, `No defenses were deleted from the database for [roleId=${roleId}]`)
            }
        } catch(err) {
            throw handleDBError(err, 'Guild Role', 'remove')
        }
        return `Role [id=${roleId}] was removed from the database`
    }
}

export default new Role()