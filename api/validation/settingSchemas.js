import { z } from "zod"

const definedSchema = z
  .any()
  .refine((v) => v !== null && v !== undefined, { message: "Value cannot be null or undefined" })

const completeSchema = z.coerce.boolean().optional()
const settingNameSchema = z.string().min(1, "Setting name is required")

export const getSettingsSchemas = {
  query: z.object({
    complete: completeSchema
  })
}

export const getSettingSchemas = {
  params: z.object({
    name: settingNameSchema
  }),
  query: z.object({
    complete: completeSchema
  })
}

export const updateSettingsSchemas = {
  body: z.object({
    settings: z
      .array(
        z.object({
          name: settingNameSchema,
          value: definedSchema
        })
      )
      .min(1, "At least one setting is required")
  }),
  query: z.object({
    complete: completeSchema
  })
}

export const resetSettingSchemas = {
  params: z.object({
    name: settingNameSchema
  }),
  query: z.object({
    complete: completeSchema
  })
}

export const createSettingValueSchema = (type, options = null) => {
  switch (type?.toLowerCase()) {
    case "decimal":
      return z.coerce.number("Value must be a number")

    case "integer":
      return z.coerce.number().int("Value must be an integer")

    case "multiselect":
      if (options && Array.isArray(options)) {
        return z.array(
          z.any().refine(
            (incomingValue) => {
              return options.some((option) => {
                if (typeof option === "object" && typeof incomingValue === "object") {
                  return JSON.stringify(option) === JSON.stringify(incomingValue)
                }
                return option === incomingValue
              })
            },
            {
              message: "Each value must match one of the provided options"
            }
          )
        )
      } else {
        return z.array(
          z.union([
            definedSchema,
            z.object({
              label: definedSchema,
              value: definedSchema
            })
          ])
        )
      }

    case "select":
    case "switch":
      if (options && Array.isArray(options)) {
        return z.any().refine(
          (incomingValue) => {
            return options.some((option) => {
              if (typeof option === "object" && typeof incomingValue === "object") {
                return JSON.stringify(option) === JSON.stringify(incomingValue)
              }
              return option === incomingValue
            })
          },
          {
            message: "Value must match one of the provided options"
          }
        )
      } else {
        return z.union([
          definedSchema,
          z.object({
            label: definedSchema,
            value: definedSchema
          })
        ])
      }

    case "text":
      return z.string("Value must be a string")

    case "textpairs":
      return z.array(z.array(z.string()).length(2, "Each pair must contain exactly two strings"))

    case "toggle":
      return z.boolean()

    default:
      return z.any()
  }
}
