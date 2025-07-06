import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { sql } from 'drizzle-orm'
import * as schema from '../api/drizzle/schema.js'

let client = null
let db = null

export async function connect() {
  if (client) return

  client = postgres(process.env.DB_URL, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10
  })

  db = drizzle(client, { schema })

  await setupDatabase()
}

async function setupDatabase() {
  try {
    await db.execute(sql`SELECT 1`)
  } catch (error) {
    throw new Error(`Test database connection failed: ${error.message}`)
  }
}

export async function clearTables() {
  if (!db) return

  try {
    await db.execute(sql`
      TRUNCATE TABLE 
        users, 
        images, 
        settings, 
        revoked_tokens, 
        email_verification_tokens,
        image_versions,
        posts,
        post_images
      RESTART IDENTITY CASCADE
    `)
  } catch (error) {
    console.warn('Warning: Could not clear tables:', error.message)
  }
}

export async function disconnect() {
  if (client) {
    await client.end()
    client = null
    db = null
  }
}

export function getDb() {
  return db
}
