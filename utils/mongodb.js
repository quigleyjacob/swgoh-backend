import { MongoClient } from 'mongodb'
import { config } from 'dotenv'
config()

const { ATLAS_USERNAME, ATLAS_PASSWORD, ATLAS_CLUSTER, ATLAS_DB, DEV } = process.env
const MONGODB_DB = ATLAS_DB
const MONGODB_URI = DEV === 'true' ?
  `mongodb://localhost:27017/${MONGODB_DB}` :
  `mongodb+srv://${ATLAS_USERNAME}:${ATLAS_PASSWORD}@${ATLAS_CLUSTER}.mongodb.net/${MONGODB_DB}`

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  )
}

if (!MONGODB_DB) {
  throw new Error(
    'Please define the MONGODB_DB environment variable inside .env.local'
  )
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = global.mongo

if (!cached) {
  cached = global.mongo = { conn: null, promise: null }
}

export async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {

    cached.promise = MongoClient.connect(MONGODB_URI).then((client) => {
      return {
        client,
        db: client.db(MONGODB_DB),
      }
    })
  }
  cached.conn = await cached.promise
  return cached.conn
}