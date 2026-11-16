import { config } from "#src/config/environment.js"
import { closeDb } from "#src/database.js"
import { aiService, createAiService } from "#src/services/aiService.js"
import { idle } from "#src/services/indexService.js"
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
  config.AI_BASE_URL = "http://127.0.0.1:9"
  Object.assign(aiService, createAiService())
})

afterEach(async () => {
  await idle()
})
