import { config } from "#src/config/environment.js"
import * as schema from "#src/database/schema.js"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

const client = postgres(config.DB_URL)
export const db = drizzle(client, {
  logger: config.ENV !== "test",
  schema
})

export async function closeDb() {
  await client.end()
}
