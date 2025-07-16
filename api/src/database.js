import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import { config } from "./config/environment.js"
import * as schema from "./database/schema.js"

const client = postgres(config.DB_URL)
export const db = drizzle(client, {
  logger: config.ENV !== "test",
  schema
})

export async function closeDb() {
  await client.end()
}
