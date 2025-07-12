import { z } from "zod";

const completeSchema = z.string().min(1).catch(false);
const settingNameSchema = z.string().min(1, "Setting name is required");

export const getSettingsSchemas = {
  query: z.object({
    complete: completeSchema
  })
};

export const getSettingSchemas = {
  params: z.object({
    name: settingNameSchema
  }),
  query: z.object({
    complete: completeSchema
  })
};

export const updateSettingsSchemas = {
  body: z.object({
    settings: z
      .array(
        z.object({
          name: settingNameSchema,
          value: z
            .any()
            .refine((val) => val !== null && val !== undefined, {
              message: "Value cannot be null or undefined"
            })
        })
      )
      .min(1, "At least one setting is required")
  }),
  query: z.object({
    complete: completeSchema
  })
};

export const resetSettingSchemas = {
  params: z.object({
    name: settingNameSchema
  })
};
