import { disconnect } from './testDb.js'
import { closeDb } from '../api/db.js'

export default async function globalTeardown() {
  await disconnect()
  await closeDb()
}
