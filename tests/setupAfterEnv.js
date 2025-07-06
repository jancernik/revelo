import { migrateDb } from '../api/drizzle/migrate.js'
import { beforeAll, afterAll, beforeEach } from '@jest/globals'
import { connect, disconnect, clearTables } from './testDb.js'

beforeAll(async () => {
  await connect()
  await migrateDb()
})

afterAll(async () => {
  await disconnect()
})

beforeEach(async () => {
  await clearTables()
})
