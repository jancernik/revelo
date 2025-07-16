import { z } from "zod"

export const limit = z.coerce.number().int().positive()
export const offset = z.coerce.number().int().nonnegative()
