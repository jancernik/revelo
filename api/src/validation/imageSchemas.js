import { definedSchema, limit, offset } from "#src/validation/baseSchemas.js"
import { z } from "zod"

const forceSchema = z.coerce.boolean().optional()

const metadataSchema = z.object({
  aperture: z.string().max(50).optional().nullable(),
  camera: z.string().max(255).optional().nullable(),
  date: z.iso.date().optional().nullable(),
  focalLength: z.string().max(50).optional().nullable(),
  iso: z.string().max(50).optional().nullable(),
  lens: z.string().max(255).optional().nullable(),
  shutterSpeed: z.string().max(50).optional().nullable()
})

const imageUploadSchema = z.object({
  metadata: metadataSchema.optional().default({}),
  sessionId: definedSchema
})

export const confirmUploadSchemas = {
  body: z.object({
    images: z.array(imageUploadSchema).min(1, "At least one image is required")
  })
}

export const updateMetadataSchemas = {
  body: metadataSchema,
  params: z.object({
    id: definedSchema
  })
}

export const fetchAllSchemas = {
  query: z.object({
    limit: limit.optional(),
    offset: offset.optional()
  })
}

export const fetchByIdSchemas = {
  params: z.object({
    id: definedSchema
  })
}

export const deleteImageSchemas = {
  params: z.object({
    id: definedSchema
  })
}

export const backfillEmbeddingsSchemas = {
  query: z.object({
    force: forceSchema
  })
}

export const backfillCaptionsSchemas = {
  query: z.object({
    force: forceSchema
  })
}
