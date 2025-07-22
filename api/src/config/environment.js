import dotenv from "dotenv"

let envType = process.env.NODE_ENV || "development"
if (envType === "dev") envType = "development"
if (envType === "prod") envType = "production"

const dotenvFiles = {
  development: ".env.dev",
  production: ".env.prod",
  test: ".env.test"
}

const envFile = dotenvFiles[envType]
if (envFile) {
  dotenv.config({ path: envFile, quiet: true })
  console.log(`Loaded environment variables from ${envFile}`)
}

const requiredEnvVars = [
  "NODE_ENV",
  "PORT",
  "DB_URL",
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
  "CLIENT_BASE_URL",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "FROM_EMAIL",
  "EMBEDDINGS_BASE_URL",
  "API_BASE_URL"
]

const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key])
if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(", ")}`)
  process.exit(1)
}

export const config = {
  API_BASE_URL: process.env.API_BASE_URL,
  CLIENT_BASE_URL: process.env.CLIENT_BASE_URL,
  DB_URL: process.env.DB_URL,
  EMBEDDINGS_BASE_URL: process.env.EMBEDDINGS_BASE_URL,
  ENV: envType,
  FROM_EMAIL: process.env.FROM_EMAIL,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_SECRET: process.env.JWT_SECRET,
  NODE_ENV: envType,
  PORT: process.env.PORT,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER,
  UPLOADS_DIR: process.env.UPLOADS_DIR
}

export async function loadEnvironment(overrideEnvType) {
  if (overrideEnvType && overrideEnvType !== envType) {
    if (overrideEnvType === "dev") overrideEnvType = "development"
    if (overrideEnvType === "prod") overrideEnvType = "production"

    const overrideFile = dotenvFiles[overrideEnvType]
    if (overrideFile) {
      dotenv.config({ override: true, path: overrideFile, quiet: true })
      console.log(`Loaded environment variables from ${overrideFile} (override)`)
    }
  }
}
