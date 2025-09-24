import { config } from "#src/config/environment.js"
import { FilteredLogger } from "#src/database/logger.js"
import * as schema from "#src/database/schema.js"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

const suppressed = ['set "embedding"', '"images"."embedding"', "to_tsvector"]

const dbUser = config.DB_USER
const dbHost = config.DB_HOST
const dbPort = config.DB_PORT
const dbName = config.DB_NAME
const dbPassword = config.DB_PASSWORD
const dbUrl = `postgres://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`

const client = postgres(dbUrl)
export const db = drizzle(client, {
  logger: config.ENV !== "test" ? new FilteredLogger(suppressed) : false,
  schema
})

export async function closeDb() {
  await client.end()
}
