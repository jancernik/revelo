import fs from "fs"
import yaml from "js-yaml"
import path from "path"

import { AppError, NotFoundError, ValidationError } from "../core/errors.js"
import { SettingsTable } from "../database/schema.js"
import { createSettingValueSchema } from "../validation/settingSchemas.js"
import BaseModel from "./BaseModel.js"

class Setting extends BaseModel {
  constructor() {
    super(SettingsTable)

    this.fileSettings = []
    this.dbSettings = []
    this.initialized = false
    this.initializationPromise = null
  }

  async get(name, opts = {}) {
    const { complete, includeRestricted } = opts
    await this.initialize()

    const setting = this.#getFileSetting(name)
    const dbSetting = this.#getDbSetting(name)

    if (!setting.public && !includeRestricted) {
      throw new NotFoundError(`Setting '${name}' does not exist`, { data: { settingName: name } })
    }

    return this.#formatSetting(setting, dbSetting, complete)
  }

  async getAll(opts = {}) {
    const { complete, includeRestricted } = opts
    await this.initialize()

    const filteredSettings = includeRestricted
      ? this.fileSettings
      : this.fileSettings.filter((setting) => setting.public === true)

    return filteredSettings.map((setting) => {
      const dbSetting = this.#getDbSetting(setting.name)
      return this.#formatSetting(setting, dbSetting, complete)
    })
  }

  async initialize() {
    if (this.initialized) return

    if (this.initializationPromise) {
      return this.initializationPromise
    }

    this.initializationPromise = this.#performInitialization()

    try {
      await this.initializationPromise
    } catch (error) {
      this.initializationPromise = null
      throw error
    }
  }

  async reset(name, opts = {}) {
    const { complete } = opts
    await this.initialize()

    const setting = this.#getFileSetting(name)
    const dbSetting = this.#getDbSetting(name)

    if (dbSetting) {
      await this.delete(dbSetting.id)
      this.dbSettings = this.dbSettings.filter((s) => s && s.id !== dbSetting.id)
    }

    return this.#formatSetting(setting, null, complete)
  }

  async set(name, value, opts = {}) {
    const { complete } = opts
    await this.initialize()

    const setting = this.#getFileSetting(name)
    const dbSetting = this.#getDbSetting(name)

    const validatedValue = this.#validateSettingValue(value, setting.type, setting.options, name)

    let updatedSetting
    const stringifiedValue = this.#stringifyValue(validatedValue, setting.type)

    if (!dbSetting) {
      updatedSetting = await this.create({ name, value: stringifiedValue })
      this.dbSettings.push(updatedSetting)
    } else {
      updatedSetting = await this.update(dbSetting.id, { value: stringifiedValue })

      const index = this.dbSettings.findIndex((s) => s && s.id === dbSetting.id)
      if (index !== -1) {
        this.dbSettings[index] = updatedSetting
      }
    }

    return this.#formatSetting(setting, updatedSetting, complete)
  }

  #formatSetting(setting, dbSetting, complete) {
    const value = this.#parseValue(
      dbSetting?.value || setting.default,
      setting.type,
      setting.options
    )

    if (complete) {
      const response = {
        category: setting.category,
        default: this.#parseValue(setting.default, setting.type, setting.options),
        description: setting.description,
        name: setting.name,
        type: setting.type,
        value
      }

      if (
        ["multiselect", "select", "switch"].includes(setting.type?.toLowerCase()) &&
        setting.options
      ) {
        response.options = setting.options
      }

      return response
    }

    return {
      name: setting.name,
      value
    }
  }

  #getDbSetting(name) {
    return this.dbSettings.find((s) => s && s.name === name)
  }

  #getFileSetting(name) {
    const setting = this.fileSettings.find((s) => s.name === name)
    if (setting) {
      return setting
    }

    throw new NotFoundError(`Setting '${name}' does not exist`, {
      data: { settingName: name }
    })
  }

  #loadConfigFile() {
    try {
      const settingsPath = path.resolve(process.cwd(), "src/config/settings.yml")
      const fileContents = fs.readFileSync(settingsPath, "utf8")
      return yaml.load(fileContents)
    } catch (error) {
      if (error.code === "ENOENT") {
        throw new AppError("Settings file not found", { isOperational: false })
      }
      if (error.name === "YAMLException") {
        throw new AppError("Invalid YAML in settings file", { isOperational: false })
      }
      throw new AppError("Failed to load settings file", { isOperational: false })
    }
  }

  #parseValue(value, type) {
    if (value === undefined || value === null || value === "") {
      return value
    }

    switch (type.toLowerCase()) {
      case "decimal":
        return parseFloat(value)
      case "integer":
        return parseInt(value, 10)
      case "multiselect":
        if (typeof value === "string") {
          try {
            const parsed = JSON.parse(value)
            return Array.isArray(parsed) ? parsed : [parsed]
          } catch {
            return value
              .split("|")
              .map((v) => v.trim())
              .filter((v) => v)
          }
        }
        return Array.isArray(value) ? value : [value]
      case "select":
      case "switch":
        if (typeof value === "string") {
          try {
            return JSON.parse(value)
          } catch {
            return value
          }
        }
        return value
      case "text":
        return value.toString()
      case "textpairs":
        if (typeof value === "string") {
          try {
            const parsed = JSON.parse(value)
            return Array.isArray(parsed) ? parsed : []
          } catch {
            return []
          }
        }
        return Array.isArray(value) ? value : []
      case "toggle":
        if (typeof value === "boolean") return value
        return value.toLowerCase() === "true"
      default:
        return value.toString()
    }
  }

  async #performInitialization() {
    const fileSettings = this.#loadConfigFile()

    this.fileSettings = Object.entries(fileSettings).map(([name, settingData]) => {
      const defaultValue = this.#stringifyValue(settingData.default, settingData.type)
      const isPublic = settingData.public === true

      return {
        name,
        ...settingData,
        default: defaultValue,
        public: isPublic
      }
    })

    this.dbSettings = (await this.findAll()).filter((s) => s !== null && s !== undefined)
    this.initialized = true
  }

  #stringifyValue(value, type) {
    if (value === undefined || value === null) {
      return ""
    }

    switch (type.toLowerCase()) {
      case "decimal":
        return parseFloat(value).toString()
      case "integer":
        return parseInt(value, 10).toString()
      case "multiselect":
        if (Array.isArray(value)) {
          return JSON.stringify(value)
        }
        return JSON.stringify([value])
      case "select":
      case "switch":
        return typeof value === "object" ? JSON.stringify(value) : value.toString()
      case "text":
        return value.toString()
      case "textpairs":
        return Array.isArray(value) ? JSON.stringify(value) : JSON.stringify([])
      case "toggle":
        return Boolean(value).toString()
      default:
        return value.toString()
    }
  }

  #validateSettingValue(value, type, options = null, settingName) {
    const schema = createSettingValueSchema(type, options)
    const result = schema.safeParse(value)

    if (!result.success) {
      throw new ValidationError(`Validation failed for setting '${settingName}'`, {
        data: {
          settingName,
          validation: result.error.errors
        }
      })
    }

    return result.data
  }
}

export default new Setting()
