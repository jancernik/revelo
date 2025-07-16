import { eq } from "drizzle-orm"
import fs from "fs/promises"
import path from "path"

import { SettingsTable } from "../../drizzle/schema.js"
import { getDb } from "../testDb.js"

export async function createTestSettingsFile(content) {
  const tempDir = path.join(process.cwd(), "temp")
  await fs.mkdir(tempDir, { recursive: true })
  const settingsPath = path.join(tempDir, "settings.yml")
  await fs.writeFile(settingsPath, content)
  return settingsPath
}

export async function cleanupTestSettingsFile(filePath) {
  try {
    const tempDir = path.dirname(filePath)
    await fs.rm(tempDir, { recursive: true, force: true })
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
