import { z } from "zod"

import { queryBoolean } from "#src/validation/baseSchemas.js"

const forceSchema = queryBoolean.optional()

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
