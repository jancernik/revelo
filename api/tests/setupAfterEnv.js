import { closeDb } from "#src/database.js"
import { clearTables, connect, disconnect } from "#tests/testDatabase.js"
import fs from "fs/promises"
import path from "path"

beforeAll(async () => {
  await connect()
})

afterAll(async () => {
  await clearTables()
  await disconnect()
  await closeDb()

  const tempDir = path.join(process.cwd(), "temp")
  try {
    await fs.rmdir(tempDir, { force: true, recursive: true })
  } catch {
    // Do nothing
  }
})

beforeEach(async () => {
  await clearTables()
})
