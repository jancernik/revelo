import { definedSchema, limit, offset } from "#src/validation/baseSchemas.js"
import { z } from "zod"

const collectionDataSchema = z.object({
  description: z.string().optional().nullable(),
  title: z.string().max(255).optional().nullable()
})

export const createCollectionSchemas = {
  body: collectionDataSchema
}

export const updateCollectionSchemas = {
  body: collectionDataSchema,
  params: z.object({
    id: definedSchema
  })
}

export const fetchAllCollectionsSchemas = {
  query: z.object({
    limit: limit.optional(),
    offset: offset.optional()
  })
}

export const fetchCollectionByIdSchemas = {
  params: z.object({
    id: definedSchema
  })
}

export const deleteCollectionSchemas = {
  params: z.object({
    id: definedSchema
  })
}

export const bulkDeleteCollectionsSchemas = {
  body: z.object({
    ids: z.array(definedSchema).min(1, "At least one collection ID is required")
  })
}

export const downloadCollectionSchemas = {
  params: z.object({
    id: definedSchema
  })
}

export const bulkDownloadCollectionsSchemas = {
  body: z.object({
    ids: z.array(definedSchema).min(1, "At least one collection ID is required")
  })
}

export const setCollectionImagesSchemas = {
  body: z.object({
    imageIds: z.array(definedSchema).min(0, "Image IDs array is required")
  }),
  params: z.object({
    id: definedSchema
  })
}
