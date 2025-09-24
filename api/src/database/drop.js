import { loadEnvironment } from "#src/config/environment.js"
import postgres from "postgres"
import readline from "readline"

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

  const confirmed = await askConfirmation(
    `Are you sure you want to drop the database "${dbName}" in the ${envType} environment? (y/N): `
  )

  if (!confirmed) {
    console.log("✓ Database drop cancelled.")
    return
  }

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
      console.error(`✗ Database ${dbName} does not exist`)
    } else {
      await adminClient`DROP DATABASE ${adminClient(dbName)}`
      console.log(`✓ Database ${dbName} dropped`)
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
