import { connectToDatabase } from '../../../utils/mongodb.js'
import { handleDBError, MyError } from '../../../utils/error.js'
import Mhann from '../../mhann.js'

class Inventory {

    async getInventory(allyCode, refresh = false) {
        const { db } = await connectToDatabase()

        try {
            if(refresh) {
                let inventory = await Mhann.getUserInventory(allyCode)
                let response = await db.collection('inventory').findOneAndUpdate({allyCode}, {$set: inventory}, {upsert: true, returnDocument: 'after'})
                if(!response.lastErrorObject.updatedExisting) {
                    throw new MyError(400, 'Could not find a GAC to update.')
                }
                return response.value
            } else {
                let response = await db.collection('inventory').findOne({allyCode})
                if(response === null) {
                    throw new MyError(404, "Inventory not found in the database, please refresh to populate data.")
                }
                return response
            }
        } catch (err) {
            throw handleDBError(err, "Inventory", 'get')
        }
    }

    async refreshInventory(allyCode) {
        const { db } = await connectToDatabase()

        let inventory = await Mhann.getUserInventory(allyCode)

        inventory.allyCode = allyCode
        inventory.lastRefreshed = new Date()

        try {
            db.collection('inventory').updateOne({allyCode: allyCode}, {$set: inventory}, {upsert: true})
        } catch(err) {
            throw handleDBError(err, 'inventory', 'set')
        }

        return inventory
    }
}

export default new Inventory()