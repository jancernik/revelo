import postgres from "postgres"
import readline from "readline"

import { loadEnvironment } from "../config.js"

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

const askConfirmation = (question) => {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes")
    })
  })
}

export async function dropDatabase(envType = process.env.NODE_ENV || "development") {
  await loadEnvironment(envType)

  if (!process.env.DB_URL) {
    console.error("✗ Error dropping database: DB_URL environment variable is required")
    return
  }
  const dbInfo = extractDbInfo(process.env.DB_URL)

  const confirmed = await askConfirmation(
    `Are you sure you want to drop the database "${dbInfo.database}" in the ${envType} environment? (y/N): `
  )

  if (!confirmed) {
    console.log("✓ Database drop cancelled.")
    return
  }

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
      console.error(`✗ Database ${dbInfo.database} does not exist`)
    } else {
      await adminClient`DROP DATABASE ${adminClient(dbInfo.database)}`
      console.log(`✓ Database ${dbInfo.database} dropped`)
    }
  } catch (error) {
    console.error(`✗ Error dropping database: ${error.message}`)
  } finally {
    await adminClient.end()
  }
  console.log(`\x1b[32m✓ Database drop completed for the ${envType} environment \x1b[0m`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const envType = process.argv[2] || process.env.NODE_ENV || "development"
  try {
    await dropDatabase(envType)
  } catch (error) {
    console.error("✗ Database drop failed:", error)
  }
}
