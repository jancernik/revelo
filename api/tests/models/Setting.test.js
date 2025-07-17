import { AppError, NotFoundError, ValidationError } from "#src/core/errors.js"
import Setting from "#src/models/Setting.js"
import {
  cleanupTestSettingsFile,
  createTestSettingsFile,
  getSettingByName,
  overrideSetting
} from "#tests/helpers/settingHelpers.js"
import { TEST_SETTINGS } from "#tests/testFixtures.js"

describe("Setting Model", () => {
  let tempDir
  let originalCwd

  beforeAll(async () => {
    originalCwd = process.cwd
    tempDir = await createTestSettingsFile(TEST_SETTINGS)
  })

  afterAll(async () => {
    process.cwd = originalCwd
    await cleanupTestSettingsFile()
  })

  beforeEach(async () => {
    process.cwd = () => tempDir
    Setting.fileSettings = []
    Setting.dbSettings = []
    Setting.initialized = false
    Setting.initializationPromise = null
  })

  describe("initialization", () => {
    it("should initialize with settings file", async () => {
      await Setting.initialize()

      expect(Setting.initialized).toBe(true)
      expect(Setting.fileSettings).toEqual(expect.arrayOf(expect.any(Object)))
      expect(Setting.fileSettings).toHaveLength(15)
    })

    it("should load public and private settings", async () => {
      await Setting.initialize()

      const publicSettings = Setting.fileSettings.filter((s) => s.public === true)
      const privateSettings = Setting.fileSettings.filter((s) => s.public === false)

      expect(publicSettings).toHaveLength(8)
      expect(privateSettings).toHaveLength(7)
    })

    it("should throw error for missing settings file", async () => {
      process.cwd = () => "/tmp/nonexistent"

      await expect(Setting.initialize()).rejects.toThrow(AppError)
    })
  })

  describe("get operations", () => {
    it("should get public setting", async () => {
      const setting = await Setting.get("showAdvancedOptions")

      expect(setting.name).toBe("showAdvancedOptions")
      expect(setting.value).toBe(true)
      expect(setting.description).toBeUndefined()
      expect(setting.category).toBeUndefined()
      expect(setting.type).toBeUndefined()
      expect(setting.default).toBeUndefined()
    })

    it("should get setting with complete format", async () => {
      const setting = await Setting.get("showAdvancedOptions", { complete: true })

      expect(setting.name).toBe("showAdvancedOptions")
      expect(setting.value).toBe(true)
      expect(setting.description).toBe("Whether to display advanced configuration options")
      expect(setting.category).toBe("UI")
      expect(setting.type).toBe("toggle")
      expect(setting.default).toBe(true)
    })

    it("should include options parameter when setting has options", async () => {
      const setting = await Setting.get("defaultLanguage", { complete: true })

      expect(setting.name).toBe("defaultLanguage")
      expect(setting.options).toEqual(["en", "es", "fr", "de", "zh"])
    })

    it("should get private setting with includeRestricted", async () => {
      const setting = await Setting.get("enableFeatureX", { includeRestricted: true })

      expect(setting.name).toBe("enableFeatureX")
      expect(setting.value).toBe(false)
    })

    it("should get setting with complete format and includeRestricted", async () => {
      const setting = await Setting.get("enableFeatureX", {
        complete: true,
        includeRestricted: true
      })

      expect(setting.name).toBe("enableFeatureX")
      expect(setting.value).toBe(false)
      expect(setting.description).toBe("Enable support for experimental Feature X")
      expect(setting.category).toBe("Features")
      expect(setting.type).toBe("toggle")
      expect(setting.default).toBe(false)
    })

    it("should include options parameter when setting has options with includeRestricted", async () => {
      const setting = await Setting.get("statusOverride", {
        complete: true,
        includeRestricted: true
      })

      expect(setting.name).toBe("statusOverride")
      expect(setting.options).toEqual(["online", "maintenance", "offline"])
    })

    it("should throw NotFoundError for private setting without includeRestricted", async () => {
      await expect(Setting.get("integrationKeys")).rejects.toThrow(NotFoundError)
    })

    it("should throw NotFoundError for non-existent setting", async () => {
      await expect(Setting.get("nonExistent")).rejects.toThrow(NotFoundError)
    })
  })

  describe("get operations value correctness", () => {
    it("should return correct toggle value", async () => {
      const setting = await Setting.get("showAdvancedOptions")

      expect(setting.value).toBe(true)
      expect(setting.value).toEqual(expect.any(Boolean))
    })

    it("should return correct integer value", async () => {
      const setting = await Setting.get("maxConcurrentJobs")

      expect(setting.value).toBe(8)
      expect(setting.value).toEqual(expect.any(Number))
      expect(Number.isInteger(setting.value)).toBe(true)
    })

    it("should return correct decimal value", async () => {
      const setting = await Setting.get("temperatureThreshold", { includeRestricted: true })

      expect(setting.value).toBe(75.5)
      expect(setting.value).toEqual(expect.any(Number))
      expect(Number.isInteger(setting.value)).toBe(false)
    })

    it("should return correct select value", async () => {
      const setting = await Setting.get("defaultLanguage")

      expect(setting.value).toBe("en")
      expect(setting.value).toEqual(expect.any(String))
    })

    it("should return correct select value", async () => {
      const setting = await Setting.get("userRole")

      expect(setting.value).toEqual({ label: "Viewer", value: "viewer" })
      expect(setting.value).toEqual(expect.any(Object))
    })

    it("should return correct multiselect value", async () => {
      const setting = await Setting.get("availableRegions")

      expect(setting.value).toEqual(["us-east", "eu-central"])
      expect(setting.value).toEqual(expect.any(Array))
      expect(setting.value).toEqual(expect.arrayContaining([expect.any(String)]))
    })

    it("should return correct multiselect value", async () => {
      const setting = await Setting.get("permittedModules")
      expect(setting.value).toEqual([
        { label: "Reporting", value: "reporting" },
        { label: "Data Import", value: "import" }
      ])
      expect(setting.value).toEqual(expect.any(Array))
      expect(setting.value).toEqual(expect.arrayContaining([expect.any(Object)]))
    })

    it("should return correct text value", async () => {
      const setting = await Setting.get("customFooterText")
      expect(setting.value).toBe("Powered by YourCompany")
      expect(setting.value).toEqual(expect.any(String))
    })

    it("should return correct textpairs value", async () => {
      const setting = await Setting.get("integrationKeys", { includeRestricted: true })
      expect(setting.value).toEqual([
        ["analytics", "key123"],
        ["crm", "token456"]
      ])
      expect(setting.value).toEqual(expect.any(Array))
      expect(setting.value).toEqual(
        expect.arrayContaining([expect.arrayContaining([expect.any(String), expect.any(String)])])
      )
    })

    it("should return correct switch value", async () => {
      const setting = await Setting.get("statusOverride", { includeRestricted: true })
      expect(setting.value).toBe("online")
      expect(setting.value).toEqual(expect.any(String))
    })

    it("should return correct switch value", async () => {
      const setting = await Setting.get("deploymentEnvironment", { includeRestricted: true })
      expect(setting.value).toEqual({ label: "Production", value: "prod" })
      expect(setting.value).toEqual(expect.any(Object))
    })

    it("should return correct multiselect value", async () => {
      const setting = await Setting.get("supportedFormats")
      expect(setting.value).toEqual(["pdf", "jpg"])
      expect(setting.value).toEqual(expect.any(Array))
      expect(setting.value).toEqual(expect.arrayContaining([expect.any(String)]))
    })

    it("should return correct text value", async () => {
      const setting = await Setting.get("maintenanceMessage", { includeRestricted: true })
      expect(setting.value).toBe("The system is temporarily unavailable due to maintenance")
      expect(setting.value).toEqual(expect.any(String))
    })

    it("should return correct decimal value", async () => {
      const setting = await Setting.get("latencyBuffer", { includeRestricted: true })
      expect(setting.value).toBe(1.25)
      expect(setting.value).toEqual(expect.any(Number))
      expect(Number.isInteger(setting.value)).toBe(false)
    })
  })

  describe("get operations with overridden values", () => {
    it("should get public setting", async () => {
      await overrideSetting("showAdvancedOptions", false)

      const setting = await Setting.get("showAdvancedOptions")

      expect(setting.name).toBe("showAdvancedOptions")
      expect(setting.value).toBe(false)
      expect(setting.description).toBeUndefined()
      expect(setting.category).toBeUndefined()
      expect(setting.type).toBeUndefined()
      expect(setting.default).toBeUndefined()
    })

    it("should get setting with complete format", async () => {
      await overrideSetting("showAdvancedOptions", false)

      const setting = await Setting.get("showAdvancedOptions", { complete: true })

      expect(setting.name).toBe("showAdvancedOptions")
      expect(setting.value).toBe(false)
      expect(setting.description).toBe("Whether to display advanced configuration options")
      expect(setting.category).toBe("UI")
      expect(setting.type).toBe("toggle")
      expect(setting.default).toBe(true)
    })

    it("should include options parameter when setting has options", async () => {
      await overrideSetting("defaultLanguage", "es")

      const setting = await Setting.get("defaultLanguage", { complete: true })

      expect(setting.name).toBe("defaultLanguage")
      expect(setting.value).toBe("es")
      expect(setting.options).toEqual(["en", "es", "fr", "de", "zh"])
    })

    it("should get private setting with includeRestricted", async () => {
      await overrideSetting("enableFeatureX", true)

      const setting = await Setting.get("enableFeatureX", { includeRestricted: true })

      expect(setting.name).toBe("enableFeatureX")
      expect(setting.value).toBe(true)
    })

    it("should get setting with complete format and includeRestricted", async () => {
      await overrideSetting("enableFeatureX", true)

      const setting = await Setting.get("enableFeatureX", {
        complete: true,
        includeRestricted: true
      })
      expect(setting.name).toBe("enableFeatureX")
      expect(setting.value).toBe(true)
      expect(setting.description).toBe("Enable support for experimental Feature X")
      expect(setting.category).toBe("Features")
      expect(setting.type).toBe("toggle")
      expect(setting.default).toBe(false)
    })

    it("should include options parameter when setting has options with includeRestricted", async () => {
      await overrideSetting("statusOverride", "maintenance")

      const setting = await Setting.get("statusOverride", {
        complete: true,
        includeRestricted: true
      })

      expect(setting.name).toBe("statusOverride")
      expect(setting.value).toBe("maintenance")
      expect(setting.options).toEqual(["online", "maintenance", "offline"])
    })

    it("should throw NotFoundError for private setting without includeRestricted", async () => {
      await expect(Setting.get("integrationKeys")).rejects.toThrow(NotFoundError)
    })

    it("should throw NotFoundError for non-existent setting", async () => {
      await expect(Setting.get("nonExistent")).rejects.toThrow(NotFoundError)
    })
  })

  describe("get operations with overridden values value correctness", () => {
    it("should return correct overridden toggle value", async () => {
      await overrideSetting("showAdvancedOptions", "false")
      const setting = await Setting.get("showAdvancedOptions")

      expect(setting.value).toBe(false)
      expect(setting.value).toEqual(expect.any(Boolean))
    })

    it("should return correct overridden integer value", async () => {
      await overrideSetting("maxConcurrentJobs", "12")
      const setting = await Setting.get("maxConcurrentJobs")

      expect(setting.value).toBe(12)
      expect(setting.value).toEqual(expect.any(Number))
      expect(Number.isInteger(setting.value)).toBe(true)
    })

    it("should return correct overridden decimal value", async () => {
      await overrideSetting("temperatureThreshold", "80.75")
      const setting = await Setting.get("temperatureThreshold", { includeRestricted: true })

      expect(setting.value).toBe(80.75)
      expect(setting.value).toEqual(expect.any(Number))
      expect(Number.isInteger(setting.value)).toBe(false)
    })

    it("should return correct overridden select value", async () => {
      await overrideSetting("defaultLanguage", "fr")
      const setting = await Setting.get("defaultLanguage")

      expect(setting.value).toBe("fr")
      expect(setting.value).toEqual(expect.any(String))
    })

    it("should return correct overridden select value", async () => {
      await overrideSetting("userRole", '{"label":"Admin","value":"admin"}')
      const setting = await Setting.get("userRole")

      expect(setting.value).toEqual({ label: "Admin", value: "admin" })
      expect(setting.value).toEqual(expect.any(Object))
    })

    it("should return correct overridden multiselect value", async () => {
      await overrideSetting("availableRegions", '["us-west","ap-south"]')
      const setting = await Setting.get("availableRegions")

      expect(setting.value).toEqual(["us-west", "ap-south"])
      expect(setting.value).toEqual(expect.any(Array))
      expect(setting.value).toEqual(expect.arrayContaining([expect.any(String)]))
    })

    it("should return correct overridden multiselect value", async () => {
      await overrideSetting(
        "permittedModules",
        '[{"label":"Notifications","value":"notifications"},{"label":"Audit Logs","value":"audit"}]'
      )

      const setting = await Setting.get("permittedModules")
      expect(setting.value).toEqual([
        { label: "Notifications", value: "notifications" },
        { label: "Audit Logs", value: "audit" }
      ])
      expect(setting.value).toEqual(expect.any(Array))
      expect(setting.value).toEqual(expect.arrayContaining([expect.any(Object)]))
    })

    it("should return correct overridden text value", async () => {
      await overrideSetting("customFooterText", "Custom Footer Message")
      const setting = await Setting.get("customFooterText")
      expect(setting.value).toBe("Custom Footer Message")
      expect(setting.value).toEqual(expect.any(String))
    })

    it("should return correct overridden textpairs value", async () => {
      await overrideSetting("integrationKeys", '[["slack","token789"],["github","key321"]]')
      const setting = await Setting.get("integrationKeys", { includeRestricted: true })
      expect(setting.value).toEqual([
        ["slack", "token789"],
        ["github", "key321"]
      ])
      expect(setting.value).toEqual(expect.any(Array))
      expect(setting.value).toEqual(
        expect.arrayContaining([expect.arrayContaining([expect.any(String), expect.any(String)])])
      )
    })

    it("should return correct overridden switch value", async () => {
      await overrideSetting("statusOverride", "maintenance")
      const setting = await Setting.get("statusOverride", { includeRestricted: true })
      expect(setting.value).toBe("maintenance")
      expect(setting.value).toEqual(expect.any(String))
    })

    it("should return correct overridden switch value", async () => {
      await overrideSetting("deploymentEnvironment", '{"label":"Staging","value":"staging"}')
      const setting = await Setting.get("deploymentEnvironment", { includeRestricted: true })
      expect(setting.value).toEqual({ label: "Staging", value: "staging" })
      expect(setting.value).toEqual(expect.any(Object))
    })

    it("should return correct overridden multiselect value", async () => {
      await overrideSetting("supportedFormats", '["png","gif","webp"]')
      const setting = await Setting.get("supportedFormats")
      expect(setting.value).toEqual(["png", "gif", "webp"])
      expect(setting.value).toEqual(expect.any(Array))
      expect(setting.value).toEqual(expect.arrayContaining([expect.any(String)]))
    })

    it("should return correct overridden text value", async () => {
      await overrideSetting("maintenanceMessage", "System upgrade in progress")
      const setting = await Setting.get("maintenanceMessage", { includeRestricted: true })
      expect(setting.value).toBe("System upgrade in progress")
      expect(setting.value).toEqual(expect.any(String))
    })

    it("should return correct overridden decimal value", async () => {
      await overrideSetting("latencyBuffer", "2.5")
      const setting = await Setting.get("latencyBuffer", { includeRestricted: true })
      expect(setting.value).toBe(2.5)
      expect(setting.value).toEqual(expect.any(Number))
      expect(Number.isInteger(setting.value)).toBe(false)
    })
  })

  describe("getAll operations with overridden values", () => {
    it("should get all public settings", async () => {
      await overrideSetting("showAdvancedOptions", false)

      const settings = await Setting.getAll()

      expect(settings).toEqual(expect.arrayOf(expect.any(Object)))
      expect(settings).toHaveLength(8)

      const showAdvancedOptions = settings.find((s) => s.name === "showAdvancedOptions")
      expect(showAdvancedOptions.value).toBe(false)

      settings.forEach((setting) => {
        expect(setting).toMatchObject({
          name: expect.any(String),
          value: expect.anything()
        })
        expect(setting).not.toHaveProperty("description")
        expect(setting).not.toHaveProperty("category")
        expect(setting).not.toHaveProperty("type")
        expect(setting).not.toHaveProperty("default")
      })
    })

    it("should get all settings with complete format", async () => {
      await overrideSetting("showAdvancedOptions", false)

      const settings = await Setting.getAll({ complete: true })

      expect(settings).toEqual(expect.arrayOf(expect.any(Object)))
      expect(settings).toHaveLength(8)

      const showAdvancedOptions = settings.find((s) => s.name === "showAdvancedOptions")
      expect(showAdvancedOptions.value).toBe(false)

      settings.forEach((setting) => {
        expect(setting).toMatchObject({
          category: expect.any(String),
          default: expect.anything(),
          description: expect.any(String),
          name: expect.any(String),
          type: expect.any(String),
          value: expect.anything()
        })
      })
    })

    it("should get all settings including restricted", async () => {
      await overrideSetting("enableFeatureX", true)

      const settings = await Setting.getAll({ includeRestricted: true })

      expect(settings).toEqual(expect.arrayOf(expect.any(Object)))
      expect(settings).toHaveLength(15)

      const enableFeatureX = settings.find((s) => s.name === "enableFeatureX")
      expect(enableFeatureX.value).toBe(true)

      settings.forEach((setting) => {
        expect(setting).toMatchObject({
          name: expect.any(String),
          value: expect.anything()
        })
        expect(setting).not.toHaveProperty("description")
        expect(setting).not.toHaveProperty("category")
        expect(setting).not.toHaveProperty("type")
        expect(setting).not.toHaveProperty("default")
      })
    })

    it("should get all settings with complete format and includeRestricted", async () => {
      await overrideSetting("enableFeatureX", true)

      const settings = await Setting.getAll({ complete: true, includeRestricted: true })

      expect(settings).toEqual(expect.arrayOf(expect.any(Object)))
      expect(settings).toHaveLength(15)

      const enableFeatureX = settings.find((s) => s.name === "enableFeatureX")
      expect(enableFeatureX.value).toBe(true)

      settings.forEach((setting) => {
        expect(setting).toMatchObject({
          category: expect.any(String),
          default: expect.anything(),
          description: expect.any(String),
          name: expect.any(String),
          type: expect.any(String),
          value: expect.anything()
        })
      })
    })
  })

  describe("set operations", () => {
    describe("setting values and return data correctness", () => {
      it("should set toggle value", async () => {
        const result = await Setting.set("showAdvancedOptions", false)

        expect(result.name).toBe("showAdvancedOptions")
        expect(result.value).toBe(false)

        const setting = await getSettingByName("showAdvancedOptions")
        expect(setting.name).toBe("showAdvancedOptions")
        expect(setting.value).toBe("false")
      })

      it("should set integer value", async () => {
        const result = await Setting.set("maxConcurrentJobs", 12)

        expect(result.name).toBe("maxConcurrentJobs")
        expect(result.value).toBe(12)

        const setting = await getSettingByName("maxConcurrentJobs")
        expect(setting.name).toBe("maxConcurrentJobs")
        expect(setting.value).toBe("12")
      })

      it("should set decimal value", async () => {
        const result = await Setting.set("temperatureThreshold", 85.5)

        expect(result.name).toBe("temperatureThreshold")
        expect(result.value).toBe(85.5)

        const setting = await getSettingByName("temperatureThreshold")
        expect(setting.name).toBe("temperatureThreshold")
        expect(setting.value).toBe("85.5")
      })

      it("should set select value", async () => {
        const result = await Setting.set("defaultLanguage", "fr")

        expect(result.name).toBe("defaultLanguage")
        expect(result.value).toBe("fr")

        const setting = await getSettingByName("defaultLanguage")
        expect(setting.name).toBe("defaultLanguage")
        expect(setting.value).toBe("fr")
      })

      it("should set select value with object", async () => {
        const result = await Setting.set("userRole", { label: "Admin", value: "admin" })

        expect(result.name).toBe("userRole")
        expect(result.value).toEqual({ label: "Admin", value: "admin" })

        const setting = await getSettingByName("userRole")
        expect(setting.name).toBe("userRole")
        expect(setting.value).toBe('{"label":"Admin","value":"admin"}')
      })

      it("should set multiselect value", async () => {
        const result = await Setting.set("availableRegions", ["us-west", "ap-south"])

        expect(result.name).toBe("availableRegions")
        expect(result.value).toEqual(["us-west", "ap-south"])

        const setting = await getSettingByName("availableRegions")
        expect(setting.name).toBe("availableRegions")
        expect(setting.value).toBe('["us-west","ap-south"]')
      })

      it("should set multiselect value with objects", async () => {
        const result = await Setting.set("permittedModules", [
          { label: "Notifications", value: "notifications" },
          { label: "Audit Logs", value: "audit" }
        ])

        expect(result.name).toBe("permittedModules")
        expect(result.value).toEqual([
          { label: "Notifications", value: "notifications" },
          { label: "Audit Logs", value: "audit" }
        ])

        const setting = await getSettingByName("permittedModules")
        expect(setting.name).toBe("permittedModules")
        expect(setting.value).toBe(
          '[{"label":"Notifications","value":"notifications"},{"label":"Audit Logs","value":"audit"}]'
        )
      })

      it("should set text value", async () => {
        const result = await Setting.set("customFooterText", "Updated footer text")

        expect(result.name).toBe("customFooterText")
        expect(result.value).toBe("Updated footer text")

        const setting = await getSettingByName("customFooterText")
        expect(setting.name).toBe("customFooterText")
        expect(setting.value).toBe("Updated footer text")
      })

      it("should set textpairs value", async () => {
        const result = await Setting.set("integrationKeys", [
          ["slack", "token789"],
          ["github", "key321"]
        ])

        expect(result.name).toBe("integrationKeys")
        expect(result.value).toEqual([
          ["slack", "token789"],
          ["github", "key321"]
        ])

        const setting = await getSettingByName("integrationKeys")
        expect(setting.name).toBe("integrationKeys")
        expect(setting.value).toBe('[["slack","token789"],["github","key321"]]')
      })

      it("should set switch value", async () => {
        const result = await Setting.set("statusOverride", "maintenance")

        expect(result.name).toBe("statusOverride")
        expect(result.value).toBe("maintenance")

        const setting = await getSettingByName("statusOverride")
        expect(setting.name).toBe("statusOverride")
        expect(setting.value).toBe("maintenance")
      })

      it("should set switch value with object", async () => {
        const result = await Setting.set("deploymentEnvironment", {
          label: "Staging",
          value: "staging"
        })

        expect(result.name).toBe("deploymentEnvironment")
        expect(result.value).toEqual({ label: "Staging", value: "staging" })

        const setting = await getSettingByName("deploymentEnvironment")
        expect(setting.name).toBe("deploymentEnvironment")
        expect(setting.value).toBe('{"label":"Staging","value":"staging"}')
      })
    })

    describe("updating existing settings", () => {
      it("should update existing setting and maintain single database record", async () => {
        await Setting.set("showAdvancedOptions", false)
        const initialSetting = await getSettingByName("showAdvancedOptions")

        expect(initialSetting.value).toBe("false")

        await Setting.set("showAdvancedOptions", true)
        const settingAfterUpdate = await getSettingByName("showAdvancedOptions")

        expect(settingAfterUpdate.value).toBe("true")
      })

      it("should update complex setting values", async () => {
        await Setting.set("availableRegions", ["sa-east", "us-east"])
        const initialSetting = await getSettingByName("availableRegions")

        expect(initialSetting.value).toBe('["sa-east","us-east"]')

        await Setting.set("availableRegions", ["ap-south", "eu-central", "us-west"])
        const settingAfterUpdate = await getSettingByName("availableRegions")

        expect(settingAfterUpdate.value).toBe('["ap-south","eu-central","us-west"]')
      })
    })

    describe("edge cases and special values", () => {
      it("should handle empty arrays", async () => {
        const result = await Setting.set("availableRegions", [])

        expect(result.value).toEqual([])

        const setting = await getSettingByName("availableRegions")
        expect(setting.name).toBe("availableRegions")
        expect(setting.value).toBe("[]")
      })

      it("should handle zero values", async () => {
        const result = await Setting.set("maxConcurrentJobs", 0)

        expect(result.value).toBe(0)

        const setting = await getSettingByName("maxConcurrentJobs")
        expect(setting.name).toBe("maxConcurrentJobs")
        expect(setting.value).toBe("0")
      })

      it("should handle floating point precision", async () => {
        const result = await Setting.set("temperatureThreshold", 0.1 + 0.2)

        expect(result.value).toBeCloseTo(0.3)

        const setting = await getSettingByName("temperatureThreshold")
        expect(setting.name).toBe("temperatureThreshold")
        expect(parseFloat(setting.value)).toBeCloseTo(0.3)
      })

      it("should handle special string characters", async () => {
        const result = await Setting.set(
          "customFooterText",
          'Text with "quotes", \\nnewlines, and emojis 🎉'
        )

        expect(result.value).toBe('Text with "quotes", \\nnewlines, and emojis 🎉')

        const setting = await getSettingByName("customFooterText")
        expect(setting.name).toBe("customFooterText")
        expect(setting.value).toBe('Text with "quotes", \\nnewlines, and emojis 🎉')
      })

      it("should handle null and undefined values appropriately", async () => {
        await expect(Setting.set("customFooterText", null)).rejects.toThrow(ValidationError)
        await expect(Setting.set("customFooterText", undefined)).rejects.toThrow(ValidationError)
      })
    })

    describe("error handling", () => {
      it("should throw NotFoundError for non-existent setting", async () => {
        await expect(Setting.set("nonExistent", "value")).rejects.toThrow(NotFoundError)
      })

      it("should throw ValidationError for invalid multiselect values", async () => {
        await expect(Setting.set("availableRegions", ["invalid-region"])).rejects.toThrow(
          ValidationError
        )
      })

      it("should throw ValidationError for invalid select values", async () => {
        await expect(Setting.set("defaultLanguage", "invalid-lang")).rejects.toThrow(
          ValidationError
        )
      })

      it("should throw ValidationError for invalid textpairs format", async () => {
        await expect(Setting.set("integrationKeys", [["single"]])).rejects.toThrow(ValidationError)
        await expect(Setting.set("integrationKeys", ["not-array-of-arrays"])).rejects.toThrow(
          ValidationError
        )
      })

      it("should throw ValidationError for wrong data types", async () => {
        await expect(Setting.set("maxConcurrentJobs", "not-a-number")).rejects.toThrow(
          ValidationError
        )
        await expect(Setting.set("showAdvancedOptions", "not-a-boolean")).rejects.toThrow(
          ValidationError
        )
      })
    })
  })

  describe("reset operations", () => {
    describe("resetting values and return data correctness", () => {
      it("should reset toggle setting to default value", async () => {
        await Setting.set("showAdvancedOptions", false)
        const result = await Setting.reset("showAdvancedOptions")

        expect(result.name).toBe("showAdvancedOptions")
        expect(result.value).toBe(true)

        const setting = await getSettingByName("showAdvancedOptions")
        expect(setting).toBeNull()
      })

      it("should reset integer setting to default value", async () => {
        await Setting.set("maxConcurrentJobs", 20)
        const result = await Setting.reset("maxConcurrentJobs")

        expect(result.name).toBe("maxConcurrentJobs")
        expect(result.value).toBe(8)

        const setting = await getSettingByName("maxConcurrentJobs")
        expect(setting).toBeNull()
      })

      it("should reset decimal setting to default value", async () => {
        await Setting.set("temperatureThreshold", 90.0)
        const result = await Setting.reset("temperatureThreshold")

        expect(result.name).toBe("temperatureThreshold")
        expect(result.value).toBe(75.5)

        const setting = await getSettingByName("temperatureThreshold")
        expect(setting).toBeNull()
      })

      it("should reset select setting to default value", async () => {
        await Setting.set("defaultLanguage", "fr")
        const result = await Setting.reset("defaultLanguage")

        expect(result.name).toBe("defaultLanguage")
        expect(result.value).toBe("en")

        const setting = await getSettingByName("defaultLanguage")
        expect(setting).toBeNull()
      })

      it("should reset select setting with object to default value", async () => {
        await Setting.set("userRole", { label: "Admin", value: "admin" })
        const result = await Setting.reset("userRole")

        expect(result.name).toBe("userRole")
        expect(result.value).toEqual({ label: "Viewer", value: "viewer" })

        const setting = await getSettingByName("userRole")
        expect(setting).toBeNull()
      })

      it("should reset multiselect setting to default value", async () => {
        await Setting.set("availableRegions", ["us-west"])
        const result = await Setting.reset("availableRegions")

        expect(result.name).toBe("availableRegions")
        expect(result.value).toEqual(["us-east", "eu-central"])

        const setting = await getSettingByName("availableRegions")
        expect(setting).toBeNull()
      })

      it("should reset multiselect setting with objects to default value", async () => {
        await Setting.set("permittedModules", [{ label: "Audit Logs", value: "audit" }])
        const result = await Setting.reset("permittedModules")

        expect(result.name).toBe("permittedModules")
        expect(result.value).toEqual([
          { label: "Reporting", value: "reporting" },
          { label: "Data Import", value: "import" }
        ])

        const setting = await getSettingByName("permittedModules")
        expect(setting).toBeNull()
      })

      it("should reset text setting to default value", async () => {
        await Setting.set("customFooterText", "Custom text")
        const result = await Setting.reset("customFooterText")

        expect(result.name).toBe("customFooterText")
        expect(result.value).toBe("Powered by YourCompany")

        const setting = await getSettingByName("customFooterText")
        expect(setting).toBeNull()
      })

      it("should reset textpairs setting to default value", async () => {
        await Setting.set("integrationKeys", [["slack", "new-token"]])
        const result = await Setting.reset("integrationKeys")

        expect(result.name).toBe("integrationKeys")
        expect(result.value).toEqual([
          ["analytics", "key123"],
          ["crm", "token456"]
        ])

        const setting = await getSettingByName("integrationKeys")
        expect(setting).toBeNull()
      })

      it("should reset switch setting to default value", async () => {
        await Setting.set("statusOverride", "maintenance")
        const result = await Setting.reset("statusOverride")

        expect(result.name).toBe("statusOverride")
        expect(result.value).toBe("online")

        const setting = await getSettingByName("statusOverride")
        expect(setting).toBeNull()
      })

      it("should reset switch setting with object to default value", async () => {
        await Setting.set("deploymentEnvironment", { label: "Staging", value: "staging" })
        const result = await Setting.reset("deploymentEnvironment")

        expect(result.name).toBe("deploymentEnvironment")
        expect(result.value).toEqual({ label: "Production", value: "prod" })

        const setting = await getSettingByName("deploymentEnvironment")
        expect(setting).toBeNull()
      })
    })

    describe("reset with complete format", () => {
      it("should reset setting with complete format including all metadata", async () => {
        await Setting.set("showAdvancedOptions", false)
        const result = await Setting.reset("showAdvancedOptions", { complete: true })

        expect(result.name).toBe("showAdvancedOptions")
        expect(result.value).toBe(true)
        expect(result.description).toBe("Whether to display advanced configuration options")
        expect(result.category).toBe("UI")
        expect(result.type).toBe("toggle")
        expect(result.default).toBe(true)

        const setting = await getSettingByName("showAdvancedOptions")
        expect(setting).toBeNull()
      })

      it("should include options in complete format when available", async () => {
        await Setting.set("defaultLanguage", "fr")
        const result = await Setting.reset("defaultLanguage", { complete: true })

        expect(result.name).toBe("defaultLanguage")
        expect(result.value).toBe("en")
        expect(result.options).toEqual(["en", "es", "fr", "de", "zh"])
        expect(result.description).toEqual("Default language used across the application")
        expect(result.category).toEqual("Localization")
        expect(result.type).toEqual("select")
        expect(result.default).toBe("en")

        const setting = await getSettingByName("defaultLanguage")
        expect(setting).toBeNull()
      })
    })

    describe("database record removal", () => {
      it("should remove database record when resetting to default", async () => {
        await Setting.set("showAdvancedOptions", false)

        let dbRecord = await getSettingByName("showAdvancedOptions")
        expect(dbRecord).toEqual(expect.any(Object))

        await Setting.reset("showAdvancedOptions")

        dbRecord = await getSettingByName("showAdvancedOptions")
        expect(dbRecord).toBeNull()
      })

      it("should remove database record for complex data types", async () => {
        const customValue = ["us-west", "ap-south"]
        await Setting.set("availableRegions", customValue)

        let dbRecord = await getSettingByName("availableRegions")
        expect(dbRecord).toEqual(expect.any(Object))
        expect(dbRecord.value).toBe(JSON.stringify(customValue))

        await Setting.reset("availableRegions")

        dbRecord = await getSettingByName("availableRegions")
        expect(dbRecord).toBeNull()
      })

      it("should not affect database if setting was never overridden", async () => {
        const initialSetting = await getSettingByName("showAdvancedOptions")
        expect(initialSetting).toBeNull()

        const result = await Setting.reset("showAdvancedOptions")
        expect(result.value).toBe(true)

        const setting = await getSettingByName("showAdvancedOptions")
        expect(setting).toBeNull()
      })
    })

    describe("edge cases", () => {
      it("should handle resetting setting multiple times", async () => {
        await Setting.set("showAdvancedOptions", false)

        const firstReset = await Setting.reset("showAdvancedOptions")
        expect(firstReset.value).toBe(true)

        const secondReset = await Setting.reset("showAdvancedOptions")
        expect(secondReset.value).toBe(true)

        const setting = await getSettingByName("showAdvancedOptions")
        expect(setting).toBeNull()
      })

      it("should throw NotFoundError for non-existent setting", async () => {
        await expect(Setting.reset("nonExistent")).rejects.toThrow(NotFoundError)
      })
    })
  })
})
