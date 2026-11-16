import { eq } from "drizzle-orm"

import { ImageDescriptionsTable } from "#src/database/schema.js"
import { getDb } from "#tests/testDatabase.js"

export async function createDescription(imageId, language, data = {}) {
  const values = {
    imageId,
    language,
    model: "test-model",
    source: "generated",
    text: "Text",
    ...data
  }
  const result = await getDb().insert(ImageDescriptionsTable).values(values).returning()
  return result[0]
}

export async function descriptionsOf(imageId) {
  const rows = await getDb()
    .select()
    .from(ImageDescriptionsTable)
    .where(eq(ImageDescriptionsTable.imageId, imageId))

  return Object.fromEntries(rows.map((row) => [row.language, row]))
}
