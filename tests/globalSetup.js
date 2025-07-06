import { migrateDb } from '../api/drizzle/migrate.js'

export default async function globalSetup() {
  await migrateDb()
}
