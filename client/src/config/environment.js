import dotenv from "dotenv"
import fs from "fs"

import { currentEnvFilePath, currentEnvType } from "../../../api/src/config/helpers.js"

const envType = currentEnvType()
const envFilePath = currentEnvFilePath()

if (fs.existsSync(envFilePath)) {
  dotenv.config({ path: envFilePath, quiet: true })
}

export const config = {
  API_BASE_URL:
    envType === "production" ? "/api" : `http://localhost:${process.env.API_PORT || 3000}`,
  API_PORT: process.env.API_PORT || 3000,
  CLIENT_PORT: process.env.CLIENT_PORT || 5173
}
