import crypto from "crypto"
import path, { dirname } from "path"
import readline from "readline"
import { fileURLToPath } from "url"

export function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
}

export function currentEnvFile(override) {
  const envType = currentEnvType(override)

  const envFiles = {
    development: ".env.dev",
    production: ".env",
    test: ".env.test"
  }

  const fileName = envFiles[envType]
  if (!fileName) error(`Unknown environment: ${envType}`)
  return fileName
}

export function currentEnvFilePath(override) {
  const envFileName = currentEnvFile(override)

  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)
  const rootPath = path.resolve(__dirname, "../../../")

  const filePath = path.join(rootPath, envFileName)
  return filePath
}

export function currentEnvType(override) {
  let envType = override || process.env.NODE_ENV || "development"
  if (envType === "dev") envType = "development"
  if (envType === "prod") envType = "production"
  return envType
}

export function error(message) {
  console.error(`✗ ${message}`)
  process.exit(1)
}

export function generateSecret(length = 32) {
  return crypto.randomBytes(length).toString("base64url")
}

export function question(readline, query) {
  return new Promise((resolve) => readline.question(query, resolve))
}

export function success(message) {
  console.log(`\x1b[32m✓ ${message}\x1b[0m`)
}
