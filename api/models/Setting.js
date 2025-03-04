import { SettingsTable } from "../drizzle/schema.js";
import { BaseModel } from "./BaseModel.js";
import fs from "fs";
import yaml from "js-yaml";
import path from "path";

export class Setting extends BaseModel {
  constructor() {
    super(SettingsTable);

    this.fileSettings = [];
    this.dbSettings = null;
    this.initialized = false;
    this.initializationPromise = null;
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

  async #doInitialize() {
    const fileSettings = this.#loadConfigFile();
    Object.keys(fileSettings).forEach(async (name) => {
      const settingData = fileSettings[name];
      const defaultValue = settingData.default.toString();
      this.fileSettings.push({ name, ...settingData, default: defaultValue });
    });

    this.dbSettings = await this.findAll();
    this.initialized = true;
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
    if (value === undefined || value === null) {
      return value;
    }

    switch (type.toLowerCase()) {
      case "integer":
        return parseInt(value, 10);
      case "decimal":
        return parseFloat(value).toFixed(2);
      case "boolean":
        return value.toLowerCase() === "true";
      case "list":
        return value.split("|").map((v) => v.trim());
      default:
        return value.toString();
    }
  }

  #stringifyValue(value, type) {
    if (value === undefined || value === null) {
      return "";
    }

    switch (type.toLowerCase()) {
      case "list":
        return value
          .filter((v) => typeof v !== "object")
          .map((v) => v.toString().trim())
          .join("|");
      default:
        return value.toString();
    }
  }

  #getFileSetting(name) {
    const setting = this.fileSettings.find((s) => s.name === name);
    if (setting) {
      return setting;
    } else {
      throw new Error(`Setting '${name}' does not exist.`);
    }
  }

  #getDbSetting(name) {
    return this.dbSettings.find((s) => s.name === name);
  }

  async get(name) {
    await this.initialize();

    const setting = this.#getFileSetting(name);
    const dbSetting = this.#getDbSetting(name);

    if (dbSetting) {
      return this.#parseValue(dbSetting.value, setting.type);
    } else {
      return this.#parseValue(setting.default, setting.type);
    }
  }

  async set(name, value) {
    await this.initialize();

    const setting = this.#getFileSetting(name);
    const dbSetting = this.#getDbSetting(name);
    let resultSetting;

    if (!dbSetting) {
      resultSetting = await this.create({
        name,
        value: this.#stringifyValue(value, setting.type)
      });
      this.dbSettings.push(resultSetting);
    } else {
      resultSetting = await this.update(dbSetting.id, {
        value: this.#stringifyValue(value, setting.type)
      });
      const index = this.dbSettings.findIndex((s) => s.id === dbSetting.id);
      if (index !== -1) {
        this.dbSettings[index] = resultSetting;
      }
    }

    return this.#parseValue(resultSetting.value, setting.type);
  }

  async reset(name) {
    await this.initialize();

    const setting = this.#getFileSetting(name);
    const dbSetting = this.#getDbSetting(name);

    if (dbSetting) {
      await this.delete(dbSetting.id);

      this.dbSettings.filter((s) => s.id !== dbSetting.id);
    }
    return this.#parseValue(setting.default, setting.type);
  }

  async getAll() {
    await this.initialize();

    const settings = this.fileSettings.map((setting) => {
      const dbSetting = this.#getDbSetting(setting.name) || {};

      return {
        name: setting.name,
        value: this.#parseValue(dbSetting.value || setting.default, setting.type),
        default: this.#parseValue(setting.default, setting.type),
        type: setting.type,
        description: setting.description,
        category: setting.category
      };
    });

    return settings;
  }
}

const SettingInstance = new Setting();
export default SettingInstance;

(async () => {
  try {
    await SettingInstance.initialize();
    // eslint-disable-next-line no-console
    console.log("Settings initialized successfully");
  } catch (error) {
    console.error("Error initializing settings.", error);
  }
})();
