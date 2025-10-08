import { closeDb } from "#src/database.js"
import storageManager from "#src/storage/storageManager.js"
import { clearTables, connect, disconnect } from "#tests/testDatabase.js"

beforeAll(async () => {
  await connect()
  await storageManager.ensureDirectories()
})

afterAll(async () => {
  await clearTables()
  await disconnect()
  await closeDb()

  await storageManager.cleanupTestFiles()
})

beforeEach(async () => {
  await clearTables()
})
