import { NotFoundError, ValidationError } from "../errors.js";
import Setting from "../models/Setting.js";

export const getSettings = async (opts) => {
  return await Setting.getAll(opts);
};

export const getSetting = async (name, opts) => {
  return await Setting.get(name, opts);
};

export const updateSettings = async (settings, opts) => {
  const updatedSettings = [];
  const notFoundErrors = [];
  const validationErrors = [];
  const unknownErrors = [];

  for (const setting of settings) {
    try {
      await Setting.get(setting.name, { includeRestricted: true });
      const updatedSetting = await Setting.set(setting.name, setting.value, opts);
      updatedSettings.push(updatedSetting);
    } catch (error) {
      if (!error.isOperational) throw error;
      if (error.statusCode === 404) {
        notFoundErrors.push({ data: error.data });
      } else if (error.statusCode === 400) {
        validationErrors.push({ data: error.data });
      } else {
        unknownErrors.push({ data: error.data });
      }
    }
  }

  const errors = [...notFoundErrors, ...validationErrors, ...unknownErrors];

  if (notFoundErrors.length > 0) {
    throw new NotFoundError(
      `Settings not found: ${notFoundErrors.map((e) => e.settingName).join(", ")}`,
      { data: { errors: notFoundErrors } }
    );
  }

  if (validationErrors.length > 0) {
    throw new ValidationError(
      `Validation failed for settings: ${validationErrors.map((e) => e.settingName).join(", ")}`,
      { data: { errors: validationErrors } }
    );
  }

  if (errors.length > 0) {
    throw new ValidationError("Multiple errors occurred while updating settings", {
      data: { errors }
    });
  }

  return updatedSettings;
};

export const resetSetting = async (name, opts) => {
  await Setting.get(name, { includeRestricted: true });
  return await Setting.reset(name, opts);
};
