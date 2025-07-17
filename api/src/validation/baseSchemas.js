import { z } from "zod"

export const limit = z.coerce.number().int().positive()
export const offset = z.coerce.number().int().nonnegative()

export const definedSchema = z
  .any()
  .refine((v) => v !== null && v !== undefined, { message: "Value cannot be null or undefined" })
