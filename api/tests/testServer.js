import { createServer } from "#src/createServer.js"

export function createTestServer() {
  return createServer({
    enableLogging: false,
    uploadsDir: "temp/uploads"
  })
}
