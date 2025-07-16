import { afterAll, beforeAll, beforeEach } from "@jest/globals"

import { closeDb } from "../db.js"
import { clearTables, connect, disconnect } from "./testDb.js"

beforeAll(async () => {
  await connect()
})

afterAll(async () => {
  await clearTables()
  await disconnect()
  await closeDb()
})

beforeEach(async () => {
  await clearTables()
})
