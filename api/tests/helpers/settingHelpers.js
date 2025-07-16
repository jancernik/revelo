import { eq } from "drizzle-orm"
import fs from "fs/promises"
import path from "path"

import { SettingsTable } from "../../src/database/schema.js"
import { getDb } from "../testDatabase.js"

export async function createTestSettingsFile(content) {
  const tempDir = path.join(process.cwd(), "temp")
  const settingsDir = path.join(tempDir, "src/config")
  await fs.mkdir(settingsDir, { recursive: true })
  const settingsPath = path.join(settingsDir, "settings.yml")
  await fs.writeFile(settingsPath, content)
  return tempDir
}

export async function cleanupTestSettingsFile() {
  const settingsDir = path.join(process.cwd(), "temp/src/config")
  const settingsPath = path.join(settingsDir, "settings.yml")
  try {
    await fs.rm(settingsPath, { recursive: true, force: true })
  } catch {}
}

export async function overrideSetting(name, value) {
  const db = getDb()
  const results = await db.insert(SettingsTable).values({ name, value }).returning()

  return results[0] || null
}

export async function getSettingByName(name) {
  const db = getDb()
  const results = await db.select().from(SettingsTable).where(eq(SettingsTable.name, name)).limit(1)

  return results[0] || null
}
