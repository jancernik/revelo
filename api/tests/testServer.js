import path from "path"
import { fileURLToPath } from "url"

import { createServer } from "../src/createServer.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function createTestServer() {
  const testUploadsDir = path.join(__dirname, "../src/test-uploads")

  return createServer({
    enableLogging: false,
    uploadsDir: testUploadsDir
  })
}
