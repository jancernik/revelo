import { loadEnvironment } from "#src/config/environment.js"
import postgres from "postgres"

export async function createDatabase(envType = process.env.NODE_ENV || "development") {
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

  const adminClient = postgres({
    database: "postgres",
    host: dbHost,
    password: dbPassword,
    port: dbPort,
    username: dbUser
  })

  try {
    const result = await adminClient`SELECT 1 FROM pg_database WHERE datname = ${dbName}`

    if (result.length === 0) {
      await adminClient`CREATE DATABASE ${adminClient(dbName)}`
      console.log(`✓ Database ${dbName} created`)
    } else {
      console.log(`✓ Database ${dbName} already exists`)
    }
  } catch (error) {
    console.error(`✗ Error creating database: ${error.message}`)
  } finally {
    await adminClient.end()
  }

  const dbClient = postgres({
    database: dbName,
    host: dbHost,
    password: dbPassword,
    port: dbPort,
    username: dbUser
  })

  try {
    const extensions = await dbClient`SELECT 1 FROM pg_extension WHERE extname = 'vector'`

    if (extensions.length === 0) {
      await dbClient`CREATE EXTENSION IF NOT EXISTS vector`
      console.log(`✓ Vector extension created in ${dbName}`)
    } else {
      console.log(`✓ Vector extension already exists in ${dbName}`)
    }
  } catch (error) {
    console.error(`✗ Error creating vector extension: ${error.message}`)
  } finally {
    await dbClient.end()
  }
  console.log(`\x1b[32m✓ Database creation completed for the ${envType} environment \x1b[0m`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const envType = process.argv[2] || process.env.NODE_ENV || "development"
  try {
    await createDatabase(envType)
  } catch (error) {
    console.error("✗ Error creating database:", error.message)
  }
}
