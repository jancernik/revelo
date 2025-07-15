import fs from 'fs/promises'
import path from 'path'
import { getDb } from '../testDb.js'
import { SettingsTable } from '../../api/drizzle/schema.js'
import { eq } from 'drizzle-orm'

export const createTestSettingsFile = async (content) => {
  const tempDir = path.join(process.cwd(), 'temp')
  await fs.mkdir(tempDir, { recursive: true })
  const settingsPath = path.join(tempDir, 'settings.yml')
  await fs.writeFile(settingsPath, content)
  return settingsPath
}

export const cleanupTestSettingsFile = async (filePath) => {
  try {
    const tempDir = path.dirname(filePath)
    await fs.rm(tempDir, { recursive: true, force: true })
  } catch {}
}

export const overrideSetting = async (name, value) => {
  const db = getDb()
  const results = await db.insert(SettingsTable).values({ name, value }).returning()

  return results[0] || null
}

export const getSettingByName = async (name) => {
  const db = getDb()
  const results = await db.select().from(SettingsTable).where(eq(SettingsTable.name, name)).limit(1)

  return results[0] || null
}
