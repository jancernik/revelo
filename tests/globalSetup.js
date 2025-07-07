import { createDatabase } from '../api/drizzle/create.js'
import { migrateDb } from '../api/drizzle/migrate.js'

export default async function globalSetup() {
  await createDatabase('test')
  await migrateDb('test')
}
