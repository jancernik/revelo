import { config } from "#src/config/environment.js"
import { FilteredLogger } from "#src/database/logger.js"
import * as schema from "#src/database/schema.js"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

const suppressed = ['set "embedding"', '"images"."embedding"', "to_tsvector"]

const client = postgres(config.DB_URL)
export const db = drizzle(client, {
  logger: config.ENV !== "test" ? new FilteredLogger(suppressed) : false,
  schema
})

export async function closeDb() {
  await client.end()
}
