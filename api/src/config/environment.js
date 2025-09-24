import { currentEnvFile, currentEnvFilePath, currentEnvType, error } from "#src/config/helpers.js"
import dotenv from "dotenv"
import fs from "fs"

const requiredEnvVars = ["DB_PASSWORD", "JWT_SECRET", "JWT_REFRESH_SECRET", "DB_NAME"]

if (!process.env.CI && fs.existsSync(currentEnvFilePath())) {
  dotenv.config({ path: currentEnvFilePath(), quiet: true })
  console.log(`Loaded environment variables from ${currentEnvFile()}`)
}

const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key])
if (missingEnvVars.length > 0) {
  error(`Missing required environment variables: ${missingEnvVars.join(", ")}`)
}

export const config = {
  AI_BASE_URL: process.env.AI_BASE_URL || `http://localhost:${process.env.AI_PORT || 8000}`,
  AI_PORT: process.env.AI_PORT || 8000,
  API_PORT: process.env.API_PORT || 3000,
  CLIENT_BASE_URL:
    process.env.CLIENT_BASE_URL || `http://localhost:${process.env.CLIENT_PORT || 5173}`,
  CLIENT_PORT: process.env.CLIENT_PORT || 5173,
  DB_HOST: process.env.DB_HOST || "localhost",
  DB_NAME: process.env.DB_NAME,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_PORT: process.env.DB_PORT || 5432,
  DB_USER: process.env.DB_USER || "postgres",
  ENV: currentEnvType(),
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_SECRET: process.env.JWT_SECRET,
  NODE_ENV: currentEnvType(),
  SMTP_EMAIL: process.env.SMTP_EMAIL,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER,
  UPLOADS_DIR: process.env.UPLOADS_DIR || "uploads"
}

export async function loadEnvironment(overrideEnvType) {
  if (overrideEnvType && overrideEnvType !== currentEnvType()) {
    if (fs.existsSync(currentEnvFilePath(overrideEnvType))) {
      dotenv.config({ override: true, path: currentEnvFilePath(overrideEnvType), quiet: true })
      console.log(`Loaded environment variables from ${currentEnvFile(overrideEnvType)} (override)`)
    } else {
      error(`Environment file not found: ${currentEnvFile(overrideEnvType)}`)
    }
  }
}
