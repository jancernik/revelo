import { beforeAll, afterAll, beforeEach } from "@jest/globals"
import { connect, disconnect, clearTables } from "./testDb.js"
import { closeDb } from "../db.js"

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
