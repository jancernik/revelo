import { afterAll, beforeAll, beforeEach } from "@jest/globals"

import { closeDb } from "../src/database.js"
import { clearTables, connect, disconnect } from "./testDatabase.js"

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
