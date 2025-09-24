import * as schema from "#src/database/schema.js"
import { sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

let client = null
let db = null

export async function clearTables() {
  if (!db) return

  const tables = Object.keys(db._.tableNamesMap).join(", ")

  try {
    await db.execute(sql`TRUNCATE TABLE ${sql.raw(tables)} RESTART IDENTITY CASCADE`)
  } catch (error) {
    console.warn("Warning: Could not clear tables:", error.message)
  }
}

export async function connect() {
  if (client) return

  const dbUser = process.env.DB_USER || "postgres"
  const dbHost = process.env.DB_HOST || "localhost"
  const dbPort = process.env.DB_PORT || 5432
  const dbName = process.env.DB_NAME
  const dbPassword = process.env.DB_PASSWORD
  const dbUrl = `postgres://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`

  client = postgres(dbUrl, {
    connect_timeout: 10,
    idle_timeout: 20,
    max: 1
  })

  db = drizzle(client, { schema })

  await setupDatabase()
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

async function setupDatabase() {
  try {
    await db.execute(sql`SELECT 1`)
  } catch (error) {
    throw new Error(`Test database connection failed: ${error.message}`)
  }
}
