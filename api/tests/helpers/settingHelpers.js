import { SettingsTable } from "#src/database/schema.js"
import { getDb } from "#tests/testDatabase.js"
import { eq } from "drizzle-orm"
import fs from "fs/promises"
import path from "path"

export async function cleanupTestSettingsFile() {
  const tempSrcDir = path.join(process.cwd(), "temp/src")
  const settingsPath = path.join(tempSrcDir, "settings.yml")
  try {
    await fs.rm(settingsPath, { force: true, recursive: true })
  } catch {
    // Do nothing
  }
  try {
    await fs.rmdir(tempSrcDir, { force: true, recursive: true })
  } catch {
    // Do nothing
  }
}

export async function createTestSettingsFile(content) {
  const tempDir = path.join(process.cwd(), "temp")
  const settingsDir = path.join(tempDir, "src/config")
  await fs.mkdir(settingsDir, { recursive: true })
  const settingsPath = path.join(settingsDir, "settings.yml")
  await fs.writeFile(settingsPath, content)
  return tempDir
}

export async function getSettingByName(name) {
  const db = getDb()
  const results = await db.select().from(SettingsTable).where(eq(SettingsTable.name, name)).limit(1)

  return results[0] || null
}

export async function overrideSetting(name, value) {
  const db = getDb()
  const results = await db.insert(SettingsTable).values({ name, value }).returning()

  return results[0] || null
}
