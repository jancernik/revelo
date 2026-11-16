import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import { config } from "#src/config/environment.js"
import { FilteredLogger } from "#src/database/logger.js"
import * as schema from "#src/database/schema.js"

const suppressed = ['"search_embedding"']

const dbUser = config.DB_USER
const dbHost = config.DB_HOST
const dbPort = config.DB_PORT
const dbName = config.DB_NAME
const dbPassword = config.DB_PASSWORD
const dbUrl = `postgres://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`

const client = postgres(dbUrl, {
  connect_timeout: 10,
  connection: { application_name: "revelo" },
  idle_timeout: 20,
  max: 10,
  max_lifetime: 60 * 30
})

export const db = drizzle(client, {
  logger: config.ENV !== "test" ? new FilteredLogger(suppressed) : false,
  schema
})

export async function checkDbHealth() {
  try {
    await client`SELECT 1`
    return { error: null, healthy: true }
  } catch (error) {
    return { error: error.message, healthy: false }
  }
}

export async function closeDb() {
  await client.end()
}

export async function withAdvisoryLock(name, task, { wait = false } = {}) {
  const lockClient = postgres(dbUrl, {
    connect_timeout: 10,
    connection: { application_name: "revelo-lock" },
    idle_timeout: 0,
    max: 1,
    max_lifetime: 0
  })

  try {
    if (wait) {
      await lockClient`SELECT pg_advisory_lock(hashtext(${name}))`
    } else {
      const [row] = await lockClient`SELECT pg_try_advisory_lock(hashtext(${name})) AS acquired`
      if (!row.acquired) return { acquired: false }
    }

    return { acquired: true, value: await task() }
  } finally {
    await lockClient.end()
  }
}
