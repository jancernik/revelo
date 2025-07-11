import { z } from "zod";

import { limit, offset } from "./baseSchemas.js";

const sessionIdSchema = z.uuid("Invalid session ID format");
const imageIdSchema = z.uuid("Invalid image ID format");

const metadataSchema = z.object({
  aperture: z.string().max(50).optional().nullable(),
  camera: z.string().max(255).optional().nullable(),
  date: z.iso.datetime().optional().nullable(),
  focalLength: z.string().max(50).optional().nullable(),
  iso: z.string().max(50).optional().nullable(),
  lens: z.string().max(255).optional().nullable(),
  shutterSpeed: z.string().max(50).optional().nullable()
});

const imageUploadSchema = z.object({
  metadata: metadataSchema.optional().default({}),
  sessionId: sessionIdSchema
});

export const confirmUploadSchema = z.object({
  images: z.array(imageUploadSchema).min(1, "At least one image is required")
});

export const updateMetadataSchema = metadataSchema;

export const fetchImagesSchema = z.object({
  limit: limit.optional(),
  offset: offset.optional()
});

export const fetchImageSchema = z.object({
  id: imageIdSchema
});
