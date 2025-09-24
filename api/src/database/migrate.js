import { loadEnvironment } from "#src/config/environment.js"
import { drizzle } from "drizzle-orm/postgres-js"
import { migrate } from "drizzle-orm/postgres-js/migrator"
import postgres from "postgres"

export async function migrateDb(envType = process.env.NODE_ENV || "development") {
  await loadEnvironment(envType)

  const missingDBConfig = [process.env.DB_PASSWORD, process.env.DB_NAME].some((v) => !v)
  if (missingDBConfig) {
    console.error(
      "✗ Error migrating database: DB_PASSWORD and DB_NAME environment variables are required"
    )
    return
  }

  const dbUser = process.env.DB_USER || "postgres"
  const dbHost = process.env.DB_HOST || "localhost"
  const dbPort = process.env.DB_PORT || 5432
  const dbName = process.env.DB_NAME
  const dbPassword = process.env.DB_PASSWORD
  const dbUrl = `postgres://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`

  const migrationClient = postgres(dbUrl, { max: 1 })

  await migrationClient`CREATE EXTENSION IF NOT EXISTS vector`
  console.log(`✓ Vector extension enabled in ${dbName}`)

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
