import { loadEnvironment } from "#src/config/environment.js"
import postgres from "postgres"

const extractDbInfo = (dbUrl) => {
  const url = new URL(dbUrl)
  return {
    database: url.pathname.slice(1),
    host: url.hostname,
    password: url.password,
    port: url.port || 5432,
    username: url.username
  }
}

export async function createDatabase(envType = process.env.NODE_ENV || "development") {
  await loadEnvironment(envType)

  if (!process.env.DB_URL) {
    console.error("✗ Error creating database: DB_URL environment variable is required")
    return
  }

  const dbInfo = extractDbInfo(process.env.DB_URL)

  const adminClient = postgres({
    database: "postgres",
    host: dbInfo.host,
    password: dbInfo.password,
    port: dbInfo.port,
    username: dbInfo.username
  })

  try {
    const result = await adminClient`SELECT 1 FROM pg_database WHERE datname = ${dbInfo.database}`

    if (result.length === 0) {
      await adminClient`CREATE DATABASE ${adminClient(dbInfo.database)}`
      console.log(`✓ Database ${dbInfo.database} created`)
    } else {
      console.log(`✓ Database ${dbInfo.database} already exists`)
    }
  } catch (error) {
    console.error(`✗ Error creating database: ${error.message}`)
  } finally {
    await adminClient.end()
  }

  const dbClient = postgres({
    database: dbInfo.database,
    host: dbInfo.host,
    password: dbInfo.password,
    port: dbInfo.port,
    username: dbInfo.username
  })

  try {
    const extensions = await dbClient`SELECT 1 FROM pg_extension WHERE extname = 'vector'`

    if (extensions.length === 0) {
      await dbClient`CREATE EXTENSION IF NOT EXISTS vector`
      console.log(`✓ Vector extension created in ${dbInfo.database}`)
    } else {
      console.log(`✓ Vector extension already exists in ${dbInfo.database}`)
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
