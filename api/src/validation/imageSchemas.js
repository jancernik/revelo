import { limit, offset } from "#src/validation/baseSchemas.js"
import { z } from "zod"

const sessionIdSchema = z.uuid("Invalid session ID format")
const imageIdSchema = z.uuid("Invalid image ID format")

const metadataSchema = z.object({
  aperture: z.string().max(50).optional().nullable(),
  camera: z.string().max(255).optional().nullable(),
  date: z.iso.datetime().optional().nullable(),
  focalLength: z.string().max(50).optional().nullable(),
  iso: z.string().max(50).optional().nullable(),
  lens: z.string().max(255).optional().nullable(),
  shutterSpeed: z.string().max(50).optional().nullable()
})

const imageUploadSchema = z.object({
  metadata: metadataSchema.optional().default({}),
  sessionId: sessionIdSchema
})

export const confirmUploadSchemas = {
  body: z.object({
    images: z.array(imageUploadSchema).min(1, "At least one image is required")
  })
}

export const updateMetadataSchemas = {
  body: metadataSchema,
  params: z.object({
    id: imageIdSchema
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
    id: imageIdSchema
  })
}

export const deleteImageSchemas = {
  params: z.object({
    id: imageIdSchema
  })
}
