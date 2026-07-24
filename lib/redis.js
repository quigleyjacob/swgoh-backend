import { createClient } from 'redis'
import dotenv from 'dotenv'
dotenv.config()

// This runs ONLY ONCE when the file is first imported
const client = createClient({ url: process.env.REDIS_URL });

client.on("error", (err) => console.error("Redis Error", err));

// Connect immediately at startup
await client.connect();

// Simplified helper functions for your app to use
export async function redisGet(key) {
  return await client.get(key);
}

export async function redisPut(key, value, expirySeconds = null) {
if(value === null || value === undefined) return
if(typeof value === 'object') {
    value = JSON.stringify(value)
}
  if (expirySeconds) {
    return await client.set(key, value, { EX: expirySeconds });
  }
  return await client.set(key, value);
}
