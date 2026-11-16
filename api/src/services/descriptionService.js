import { and, eq, inArray, ne, notExists, sql } from "drizzle-orm"

import { descriptionConfig, descriptionLanguages } from "#src/config/descriptions.js"
import { db } from "#src/database.js"
import { ImageDescriptionsTable, ImagesTable } from "#src/database/schema.js"
import Image from "#src/models/Image.js"

const table = ImageDescriptionsTable
const notEdited = ne(table.source, "edited")

const rowIs = (language) => and(eq(table.imageId, ImagesTable.id), eq(table.language, language))

const lacksRow = (condition) =>
  notExists(db.select({ imageId: table.imageId }).from(table).where(condition))

const writeAutomatic = async (tx, values) => {
  const written = await tx
    .insert(table)
    .values({ ...values, updatedAt: new Date() })
    .onConflictDoUpdate({
      set: {
        model: values.model,
        source: values.source,
        text: values.text,
        updatedAt: new Date()
      },
      setWhere: notEdited,
      target: [table.imageId, table.language]
    })
    .returning({ imageId: table.imageId })

  return written.length > 0
}

export const saveGenerated = async (imageId, { model, text }) => {
  const language = descriptionConfig.sourceLanguage

  return await db.transaction(async (tx) => {
    const written = await writeAutomatic(tx, {
      imageId,
      language,
      model,
      source: "generated",
      text
    })
    if (written) await deleteAutomaticTranslations(tx, imageId)
    return written
  })
}

const deleteAutomaticTranslations = async (tx, imageId) => {
  await tx
    .delete(table)
    .where(
      and(
        eq(table.imageId, imageId),
        ne(table.language, descriptionConfig.sourceLanguage),
        notEdited
      )
    )
}

export const saveTranslated = async (imageId, language, { model, sourceText, text }) => {
  return await db.transaction(async (tx) => {
    const [source] = await tx
      .select({ text: table.text })
      .from(table)
      .where(and(eq(table.imageId, imageId), eq(table.language, descriptionConfig.sourceLanguage)))
      .for("share")
    if (source?.text !== sourceText) return false

    return await writeAutomatic(tx, { imageId, language, model, source: "translated", text })
  })
}

export const saveEdited = async (imageId, language, text) => {
  const values = { model: null, source: "edited", text, updatedAt: new Date() }

  await db.transaction(async (tx) => {
    await tx
      .insert(table)
      .values({ imageId, language, ...values })
      .onConflictDoUpdate({ set: values, target: [table.imageId, table.language] })
    if (language === descriptionConfig.sourceLanguage)
      await deleteAutomaticTranslations(tx, imageId)
  })
}

export const discard = async (imageId, languages = descriptionLanguages) => {
  await db.delete(table).where(and(eq(table.imageId, imageId), inArray(table.language, languages)))
}

export const findByImage = async (imageId) => {
  const rows = await db
    .select({
      language: table.language,
      source: table.source,
      text: table.text,
      updatedAt: table.updatedAt
    })
    .from(table)
    .where(eq(table.imageId, imageId))

  return descriptionLanguages.map(
    (language) =>
      rows.find((row) => row.language === language) ?? {
        language,
        source: null,
        text: null,
        updatedAt: null
      }
  )
}

export const findImagesToDescribe = async ({ force = false } = {}) => {
  const language = descriptionConfig.sourceLanguage
  const existing = force ? and(rowIs(language), eq(table.source, "edited")) : rowIs(language)

  const rows = await db.select({ id: ImagesTable.id }).from(ImagesTable).where(lacksRow(existing))
  if (rows.length === 0) return []

  return await Image.findAllWithVersionsRaw({
    where: inArray(
      ImagesTable.id,
      rows.map((row) => row.id)
    )
  })
}

export const findMissingTranslations = async () => {
  const missing = []

  for (const language of descriptionConfig.targetLanguages) {
    const rows = await db
      .select({ imageId: table.imageId, text: table.text })
      .from(table)
      .where(
        and(
          eq(table.language, descriptionConfig.sourceLanguage),
          sql`not exists (
            select 1 from ${table} as target
            where target.image_id = ${table.imageId} and target.language = ${language}
          )`
        )
      )
    missing.push(...rows.map((row) => ({ ...row, language })))
  }

  return missing
}

export const hasPendingDescriptions = async () => {
  const undescribed = await db
    .select({ id: ImagesTable.id })
    .from(ImagesTable)
    .where(lacksRow(rowIs(descriptionConfig.sourceLanguage)))
    .limit(1)

  return undescribed.length > 0 || (await findMissingTranslations()).length > 0
}
