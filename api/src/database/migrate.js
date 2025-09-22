import { loadEnvironment } from "#src/config/environment.js"
import { drizzle } from "drizzle-orm/postgres-js"
import { migrate } from "drizzle-orm/postgres-js/migrator"
import postgres from "postgres"

export async function migrateDb(envType = process.env.NODE_ENV || "development") {
  await loadEnvironment(envType)

  if (!process.env.DB_URL) {
    console.error("✗ Error migrating database: DB_URL environment variable is required")
    return
  }

  const migrationClient = postgres(process.env.DB_URL, { max: 1 })

  // Enable pgvector extension before running migrations
  await migrationClient`CREATE EXTENSION IF NOT EXISTS vector`
  console.log("✓ pgvector extension enabled")

  await migrate(drizzle(migrationClient), {
    migrationsFolder: "./src/database/migrations"
  })

  await migrationClient.end()
  console.log(`\x1b[32m✓ Database migration completed for the ${envType} environment \x1b[0m`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const envType = process.argv[2] || process.env.NODE_ENV || "development"
  try {
    await migrateDb(envType)
  } catch (error) {
    console.error("✗ Migration failed:", error)
  }
}
