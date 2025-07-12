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

  for (const setting of settings) {
    try {
      await Setting.get(setting.name, { includeRestricted: true });
      const updatedSetting = await Setting.set(setting.name, setting.value, opts);
      updatedSettings.push(updatedSetting);
    } catch (error) {
      if (!error.isOperational) throw error;
      if (error.statusCode === 404) {
        notFoundErrors.push(setting.name);
      }
      if (error.statusCode === 400) {
        validationErrors.push({ name: setting.name });
      }
    }
  }

  if (notFoundErrors.length > 0) {
    throw new NotFoundError(`Settings not found: ${notFoundErrors.join(", ")}`);
  }
  if (validationErrors.length > 0) {
    throw new ValidationError(`Validation failed for settings: ${validationErrors.join(", ")}`);
  }

  return updatedSettings;
};

export const resetSetting = async (name, opts) => {
  await Setting.get(name, { includeRestricted: true });
  return await Setting.reset(name, opts);
};
