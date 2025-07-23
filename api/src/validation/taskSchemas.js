import { z } from "zod"

const forceSchema = z.coerce.boolean().optional()

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
