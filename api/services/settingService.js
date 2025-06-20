import Setting from "../models/Setting.js";

export const getSettings = async (opts = {}) => {
  try {
    return await Setting.getAll(opts);
  } catch (error) {
    throw new Error(`Failed to get settings: ${error.message}`);
  }
};

export const getSetting = async (name, opts = {}) => {
  if (!name) {
    throw new Error("Failed to get setting: Setting name is required");
  }

  try {
    return await Setting.get(name, opts);
  } catch (error) {
    throw new Error(`Failed to get setting '${name}': ${error.message}`);
  }
};

export const updateSetting = async (name, value) => {
  if (!name) {
    throw new Error("Failed to update setting: Setting name is required");
  }

  if (value === undefined) {
    throw new Error(`Failed to update setting '${name}': Setting value is required`);
  }

  try {
    await Setting.get(name, { includeRestricted: true });
    return await Setting.set(name, value);
  } catch (error) {
    throw new Error(`Failed to update setting '${name}': ${error.message}`);
  }
};

export const updateMultipleSettings = async (settingsData) => {
  if (!settingsData || typeof settingsData !== "object") {
    throw new Error("Failed to update settings: Settings data is required and must be an object");
  }

  const settingNames = Object.keys(settingsData);
  if (settingNames.length === 0) {
    throw new Error("Failed to update settings: At least one setting must be provided");
  }

  const results = [];
  const errors = [];

  for (const name of settingNames) {
    try {
      await Setting.get(name, { includeRestricted: true });
      const result = await Setting.set(name, settingsData[name]);
      results.push(result);
    } catch (error) {
      errors.push({
        error: error.message,
        name
      });
    }
  }

  if (errors.length > 0) {
    const errorMessage = `Failed to update some settings: ${errors.map((e) => `${e.name}: ${e.error}`).join(", ")}`;
    const error = new Error(errorMessage);
    error.details = { failed: errors, successful: results };
    throw error;
  }

  return results;
};

export const resetSetting = async (name) => {
  if (!name) {
    throw new Error("Failed to reset setting: Setting name is required");
  }

  try {
    await Setting.get(name, { includeRestricted: true });
    return await Setting.reset(name);
  } catch (error) {
    throw new Error(`Failed to reset setting '${name}': ${error.message}`);
  }
};
