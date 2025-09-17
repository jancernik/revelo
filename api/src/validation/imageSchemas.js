import { definedSchema, limit, offset } from "#src/validation/baseSchemas.js"
import { z } from "zod"

const metadataSchema = z.object({
  aperture: z.string().max(50).optional().nullable(),
  camera: z.string().max(255).optional().nullable(),
  date: z
    .union([z.iso.date(), z.string().max(0)])
    .optional()
    .nullable(),
  focalLength: z.string().max(50).optional().nullable(),
  focalLengthEquivalent: z.string().max(50).optional().nullable(),
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

export const searchSchemas = {
  query: z.object({
    limit: limit.optional(),
    offset: offset.optional(),
    text: z.string().trim().min(1, "Search text is required").max(500, "Search text too long")
  })
}
