import fs from "fs";
import yaml from "js-yaml";
import path from "path";

import { SettingsTable } from "../drizzle/schema.js";
import BaseModel from "./BaseModel.js";

class Setting extends BaseModel {
  constructor() {
    super(SettingsTable);

    this.fileSettings = [];
    this.dbSettings = null;
    this.initialized = false;
    this.initializationPromise = null;
  }

  async get(name, opts = {}) {
    const { complete } = opts;
    await this.initialize();

    const setting = this.#getFileSetting(name);
    const dbSetting = this.#getDbSetting(name);

    if (!setting.public && !opts.includeRestricted) {
      throw new Error(`Setting '${name}' does not exist.`);
    }

    return this.#formatSettingResponse(setting, dbSetting, complete);
  }

  async getAll(opts = {}) {
    const { complete, includeRestricted } = opts;
    await this.initialize();

    const filteredSettings = includeRestricted
      ? this.fileSettings
      : this.fileSettings.filter((setting) => setting.public === true);

    return filteredSettings.map((setting) => {
      const dbSetting = this.#getDbSetting(setting.name);
      return this.#formatSettingResponse(setting, dbSetting, complete);
    });
  }

  async initialize() {
    if (this.initialized) return;

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.#doInitialize();

    try {
      await this.initializationPromise;
    } catch (error) {
      this.initializationPromise = null;
      throw error;
    }
  }

  async reset(name) {
    await this.initialize();

    const setting = this.#getFileSetting(name);
    const dbSetting = this.#getDbSetting(name);

    if (dbSetting) {
      await this.delete(dbSetting.id);
      this.dbSettings = this.dbSettings.filter((s) => s.id !== dbSetting.id);
    }

    const defaultValue = this.#parseValue(setting.default, setting.type, setting.options);
    return {
      name,
      value: defaultValue
    };
  }

  async set(name, value) {
    await this.initialize();

    const setting = this.#getFileSetting(name);
    const dbSetting = this.#getDbSetting(name);

    // Validate the value before setting
    this.#validateSettingValue(value, setting.type, setting.options);

    let resultSetting;
    const stringifiedValue = this.#stringifyValue(value, setting.type);

    if (!dbSetting) {
      resultSetting = await this.create({
        name,
        value: stringifiedValue
      });
      this.dbSettings.push(resultSetting);
    } else {
      resultSetting = await this.update(dbSetting.id, {
        value: stringifiedValue
      });

      const index = this.dbSettings.findIndex((s) => s.id === dbSetting.id);
      if (index !== -1) {
        this.dbSettings[index] = resultSetting;
      }
    }

    const parsedValue = this.#parseValue(resultSetting.value, setting.type, setting.options);
    return {
      name,
      value: parsedValue
    };
  }

  async #doInitialize() {
    const fileSettings = this.#loadConfigFile();

    this.fileSettings = Object.entries(fileSettings).map(([name, settingData]) => {
      const defaultValue = this.#stringifyValue(settingData.default, settingData.type);
      const isPublic = settingData.public === true;

      return {
        name,
        ...settingData,
        default: defaultValue,
        public: isPublic
      };
    });

    this.dbSettings = await this.findAll();
    this.initialized = true;
  }

  #formatSettingResponse(setting, dbSetting, complete) {
    const value = this.#parseValue(
      dbSetting?.value || setting.default,
      setting.type,
      setting.options
    );

    if (complete) {
      const response = {
        category: setting.category,
        default: this.#parseValue(setting.default, setting.type, setting.options),
        description: setting.description,
        name: setting.name,
        type: setting.type,
        value
      };

      if (
        ["multiselect", "select", "switch"].includes(setting.type?.toLowerCase()) &&
        setting.options
      ) {
        response.options = setting.options;
      }

      return response;
    }

    return {
      name: setting.name,
      value
    };
  }

  #getDbSetting(name) {
    return this.dbSettings.find((s) => s.name === name);
  }

  #getFileSetting(name) {
    const setting = this.fileSettings.find((s) => s.name === name);
    if (setting) {
      return setting;
    }

    throw new Error(`Setting '${name}' does not exist.`);
  }

  #loadConfigFile() {
    try {
      const settingsPath = path.resolve(process.cwd(), "settings.yml");
      const fileContents = fs.readFileSync(settingsPath, "utf8");
      return yaml.load(fileContents);
    } catch (error) {
      console.error("Error loading settings file.", error);
      return {};
    }
  }

  #parseValue(value, type) {
    if (value === undefined || value === null || value === "") {
      return value;
    }

    switch (type.toLowerCase()) {
      case "decimal":
        return parseFloat(value);
      case "integer":
        return parseInt(value, 10);
      case "multiselect":
        if (typeof value === "string") {
          try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [parsed];
          } catch {
            return value
              .split("|")
              .map((v) => v.trim())
              .filter((v) => v);
          }
        }
        return Array.isArray(value) ? value : [value];
      case "select":
      case "switch":
        if (typeof value === "string") {
          try {
            return JSON.parse(value);
          } catch {
            return value;
          }
        }
        return value;
      case "text":
        return value.toString();
      case "textpairs":
        if (typeof value === "string") {
          try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        }
        return Array.isArray(value) ? value : [];
      case "toggle":
        if (typeof value === "boolean") return value;
        return value.toLowerCase() === "true";
      default:
        return value.toString();
    }
  }

  #stringifyValue(value, type) {
    if (value === undefined || value === null) {
      return "";
    }

    switch (type.toLowerCase()) {
      case "decimal":
        return parseFloat(value).toString();
      case "integer":
        return parseInt(value, 10).toString();
      case "multiselect":
        if (Array.isArray(value)) {
          return JSON.stringify(value);
        }
        return JSON.stringify([value]);
      case "select":
      case "switch":
        return typeof value === "object" ? JSON.stringify(value) : value.toString();
      case "text":
        return value.toString();
      case "textpairs":
        return Array.isArray(value) ? JSON.stringify(value) : JSON.stringify([]);
      case "toggle":
        return Boolean(value).toString();
      default:
        return value.toString();
    }
  }

  #validateSettingValue(value, type, options = null) {
    switch (type.toLowerCase()) {
      case "multiselect":
        if (options && Array.isArray(options)) {
          const validValues = options.map((opt) =>
            typeof opt === "object" ? opt.value || opt.key || opt.id : opt
          );
          const valuesToCheck = Array.isArray(value) ? value : [value];

          for (const val of valuesToCheck) {
            const checkValue = typeof val === "object" ? val.value || val.key || val.id : val;

            if (!validValues.includes(checkValue)) {
              throw new Error(
                `Invalid value for multiselect. All values must be one of: ${validValues.join(", ")}`
              );
            }
          }
        }
        break;
      case "select":
      case "switch":
        if (options && Array.isArray(options)) {
          const validValues = options.map((opt) =>
            typeof opt === "object" ? opt.value || opt.key || opt.id : opt
          );
          const checkValue =
            typeof value === "object" ? value.value || value.key || value.id : value;

          if (!validValues.includes(checkValue)) {
            throw new Error(`Invalid value for ${type}. Must be one of: ${validValues.join(", ")}`);
          }
        }
        break;
      case "textpairs":
        if (!Array.isArray(value)) {
          throw new Error("textPairs value must be an array of objects");
        }
        for (const pair of value) {
          if (typeof pair !== "object" || pair === null) {
            throw new Error("Each textPairs item must be an object");
          }
        }
        break;
    }
  }
}

export default new Setting();
