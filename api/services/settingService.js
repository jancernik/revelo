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
    await Setting.get(name);
    return await Setting.set(name, value);
  } catch (error) {
    throw new Error(`Failed to update setting '${name}': ${error.message}`);
  }
};

export const resetSetting = async (name) => {
  if (!name) {
    throw new Error("Failed to reset setting: Setting name is required");
  }

  try {
    await Setting.get(name);
    return await Setting.reset(name);
  } catch (error) {
    throw new Error(`Failed to reset setting '${name}': ${error.message}`);
  }
};
