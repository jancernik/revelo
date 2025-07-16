import Setting from "#src/models/Setting.js"
import {
  createAccessToken,
  createAdminUser,
  createRegularUser
} from "#tests/helpers/authHelpers.js"
import { cleanupTestSettingsFile, createTestSettingsFile } from "#tests/helpers/settingHelpers.js"
import { TEST_SETTINGS } from "#tests/testFixtures.js"
import { createTestServer } from "#tests/testServer.js"
import { beforeAll, describe, expect, it } from "@jest/globals"
import request from "supertest"

const api = createTestServer()

describe("Settings Endpoints", () => {
  let tempDir
  let originalCwd
  let regularUserToken
  let adminUserToken

  beforeAll(async () => {
    originalCwd = process.cwd
    tempDir = await createTestSettingsFile(TEST_SETTINGS)

    const regularUser = await createRegularUser()
    const adminUser = await createAdminUser()

    regularUserToken = createAccessToken(regularUser)
    adminUserToken = createAccessToken(adminUser)
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

  describe("GET /settings", () => {
    it("should get public settings for unauthenticated user", async () => {
      const response = await request(api).get("/settings").expect(200)

      expect(response.body.status).toBe("success")
      expect(response.body.data.settings).toEqual(expect.arrayOf(expect.any(Object)))

      const settings = response.body.data.settings
      expect(settings).toHaveLength(8)

      settings.forEach((setting) => {
        expect(setting.name).toBeDefined()
        expect(setting.value).toBeDefined()
        expect(setting.description).not.toBeDefined()
        expect(setting.category).not.toBeDefined()
        expect(setting.type).not.toBeDefined()
        expect(setting.default).not.toBeDefined()
      })
    })

    it("should get public settings for regular user", async () => {
      const response = await request(api)
        .get("/settings")
        .set("Authorization", `Bearer ${regularUserToken}`)
        .expect(200)

      expect(response.body.status).toBe("success")
      expect(response.body.data.settings).toEqual(expect.arrayOf(expect.any(Object)))

      const settings = response.body.data.settings
      expect(settings).toHaveLength(8)

      settings.forEach((setting) => {
        expect(setting.name).toBeDefined()
        expect(setting.value).toBeDefined()
        expect(setting.description).not.toBeDefined()
        expect(setting.category).not.toBeDefined()
        expect(setting.type).not.toBeDefined()
        expect(setting.default).not.toBeDefined()
      })
    })

    it("should not get settings with complete format for regular user", async () => {
      const response = await request(api)
        .get("/settings?complete=true")
        .set("Authorization", `Bearer ${regularUserToken}`)
        .expect(200)

      expect(response.body.status).toBe("success")
      expect(response.body.data.settings).toEqual(expect.arrayOf(expect.any(Object)))

      const settings = response.body.data.settings
      expect(settings).toHaveLength(8)

      settings.forEach((setting) => {
        expect(setting.name).toBeDefined()
        expect(setting.value).toBeDefined()
        expect(setting.description).not.toBeDefined()
        expect(setting.category).not.toBeDefined()
        expect(setting.type).not.toBeDefined()
        expect(setting.default).not.toBeDefined()
      })
    })

    it("should get all settings for admin user", async () => {
      const response = await request(api)
        .get("/settings")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .expect(200)

      expect(response.body.status).toBe("success")
      expect(response.body.data.settings).toEqual(expect.arrayOf(expect.any(Object)))

      const settings = response.body.data.settings
      expect(settings).toHaveLength(15)

      settings.forEach((setting) => {
        expect(setting.name).toBeDefined()
        expect(setting.value).toBeDefined()
        expect(setting.description).not.toBeDefined()
        expect(setting.category).not.toBeDefined()
        expect(setting.type).not.toBeDefined()
        expect(setting.default).not.toBeDefined()
      })
    })

    it("should get all settings with complete format for admin user", async () => {
      const response = await request(api)
        .get("/settings?complete=true")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .expect(200)

      expect(response.body.status).toBe("success")
      expect(response.body.data.settings).toEqual(expect.arrayOf(expect.any(Object)))

      const settings = response.body.data.settings
      expect(settings).toHaveLength(15)

      settings.forEach((setting) => {
        expect(setting.name).toBeDefined()
        expect(setting.value).toBeDefined()
        expect(setting.description).toBeDefined()
        expect(setting.category).toBeDefined()
        expect(setting.type).toBeDefined()
        expect(setting.default).toBeDefined()
      })
    })
  })

  describe("GET /settings/:name", () => {
    it("should get public setting", async () => {
      const response = await request(api)
        .get("/settings/defaultLanguage")
        .set("Authorization", `Bearer ${regularUserToken}`)
        .expect(200)
      expect(response.body.status).toBe("success")
      expect(response.body.data.setting).toEqual(expect.any(Object))

      const setting = response.body.data.setting
      expect(setting.name).toBe("defaultLanguage")
      expect(setting.value).toBe("en")
    })

    it("should get private setting when admin", async () => {
      const response = await request(api)
        .get("/settings/statusOverride")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .expect(200)
      expect(response.body.status).toBe("success")
      expect(response.body.data.setting).toEqual(expect.any(Object))

      const setting = response.body.data.setting
      expect(setting.name).toBe("statusOverride")
      expect(setting.value).toBe("online")
    })

    it("should return 404 for non-existent setting", async () => {
      const response = await request(api)
        .get("/settings/nonExistent")
        .set("Authorization", `Bearer ${regularUserToken}`)
        .expect(404)

      expect(response.body.status).toBe("fail")
    })

    it("should return 404 for private setting for unauthenticated user", async () => {
      const response = await request(api).get("/settings/deploymentEnvironment").expect(404)

      expect(response.body.status).toBe("fail")
    })

    it("should return 404 for private setting for regular user", async () => {
      const response = await request(api)
        .get("/settings/deploymentEnvironment")
        .set("Authorization", `Bearer ${regularUserToken}`)
        .expect(404)

      expect(response.body.status).toBe("fail")
    })
  })

  describe("PUT /settings", () => {
    it("should update setting for admin user", async () => {
      const response = await request(api)
        .put("/settings")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .send({
          settings: [{ name: "customFooterText", value: "New footer test" }]
        })
        .expect(200)

      expect(response.body.status).toBe("success")
      expect(response.body.data.settings).toEqual(expect.arrayOf(expect.any(Object)))

      const settings = response.body.data.settings
      expect(settings).toHaveLength(1)

      expect(settings).toEqual([{ name: "customFooterText", value: "New footer test" }])
    })

    it("should update setting for admin user with complete format", async () => {
      const response = await request(api)
        .put("/settings?complete=true")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .send({
          settings: [{ name: "maxConcurrentJobs", value: 3 }]
        })
        .expect(200)

      expect(response.body.status).toBe("success")
      expect(response.body.data.settings).toEqual(expect.arrayOf(expect.any(Object)))

      const settings = response.body.data.settings
      expect(settings).toHaveLength(1)

      expect(settings).toEqual([
        {
          category: "Performance",
          default: 8,
          description: "Maximum number of concurrent background jobs",
          name: "maxConcurrentJobs",
          type: "integer",
          value: 3
        }
      ])
    })

    it("should update multiple settings for admin user", async () => {
      const response = await request(api)
        .put("/settings")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .send({
          settings: [
            { name: "userRole", value: { label: "Admin", value: "admin" } },
            { name: "enableFeatureX", value: true },
            { name: "deploymentEnvironment", value: { label: "Staging", value: "staging" } }
          ]
        })
        .expect(200)

      expect(response.body.status).toBe("success")
      expect(response.body.data.settings).toEqual(expect.arrayOf(expect.any(Object)))

      const settings = response.body.data.settings
      expect(settings).toHaveLength(3)

      expect(settings).toEqual([
        { name: "userRole", value: { label: "Admin", value: "admin" } },
        { name: "enableFeatureX", value: true },
        {
          name: "deploymentEnvironment",
          value: { label: "Staging", value: "staging" }
        }
      ])
    })

    it("should update multiple settings for admin user with complete format", async () => {
      const response = await request(api)
        .put("/settings?complete=true")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .send({
          settings: [
            { name: "userRole", value: { label: "Admin", value: "admin" } },
            { name: "enableFeatureX", value: true }
          ]
        })
        .expect(200)

      expect(response.body.status).toBe("success")
      expect(response.body.data.settings).toEqual(expect.arrayOf(expect.any(Object)))

      const settings = response.body.data.settings
      expect(settings).toHaveLength(2)

      expect(settings).toEqual([
        {
          category: "Security",
          default: { label: "Viewer", value: "viewer" },
          description: "Default role assigned to new users",
          name: "userRole",
          options: [
            { label: "Viewer", value: "viewer" },
            { label: "Editor", value: "editor" },
            { label: "Admin", value: "admin" }
          ],
          type: "select",
          value: { label: "Admin", value: "admin" }
        },
        {
          category: "Features",
          default: false,
          description: "Enable support for experimental Feature X",
          name: "enableFeatureX",
          type: "toggle",
          value: true
        }
      ])
    })

    it("should return 401 for unauthenticated user", async () => {
      const response = await request(api)
        .put("/settings")
        .send({
          settings: [{ name: "enableFeatureX", value: true }]
        })
        .expect(401)

      expect(response.body.status).toBe("fail")
    })

    it("should return 401 for regular user", async () => {
      const response = await request(api)
        .put("/settings")
        .set("Authorization", `Bearer ${regularUserToken}`)
        .send({
          settings: [{ name: "enableFeatureX", value: true }]
        })
        .expect(401)

      expect(response.body.status).toBe("fail")
    })

    it("should validate boolean setting values", async () => {
      const response = await request(api)
        .put("/settings")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .send({
          settings: [{ name: "showAdvancedOptions", value: 12 }]
        })
        .expect(400)

      expect(response.body.status).toBe("fail")
      expect(response.body.data.errors).toBeDefined()
    })

    it("should validate string setting values", async () => {
      const response = await request(api)
        .put("/settings")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .send({
          settings: [{ name: "customFooterText", value: true }]
        })
        .expect(400)

      expect(response.body.status).toBe("fail")
      expect(response.body.data.errors).toBeDefined()
    })

    it("should return 404 for non-existent setting", async () => {
      const response = await request(api)
        .put("/settings")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .send({
          settings: [{ name: "nonExistent", value: "value" }]
        })
        .expect(404)

      expect(response.body.status).toBe("fail")
    })

    it("should return 400 for missing request body", async () => {
      const response = await request(api)
        .put("/settings")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .send({})
        .expect(400)

      expect(response.body.status).toBe("fail")
    })
  })

  describe("DELETE /settings/:name", () => {
    beforeEach(async () => {
      await request(api)
        .put("/settings")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .send({
          settings: [{ name: "defaultLanguage", value: "de" }]
        })
    })

    it("should reset setting to default", async () => {
      const response = await request(api)
        .delete("/settings/defaultLanguage")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .expect(200)

      expect(response.body.data.setting).toEqual(expect.any(Object))

      const setting = response.body.data.setting
      expect(setting.name).toBe("defaultLanguage")
      expect(setting.value).toBe("en")
    })

    it("should return 401 for unauthenticated user", async () => {
      const response = await request(api).delete("/settings/defaultLanguage").expect(401)

      expect(response.body.status).toBe("fail")
    })

    it("should return 401 for regular user", async () => {
      const response = await request(api)
        .delete("/settings/defaultLanguage")
        .set("Authorization", `Bearer ${regularUserToken}`)
        .expect(401)

      expect(response.body.status).toBe("fail")
    })

    it("should return 404 for non-existent setting", async () => {
      const response = await request(api)
        .delete("/settings/nonExistent")
        .set("Authorization", `Bearer ${adminUserToken}`)
        .expect(404)

      expect(response.body.status).toBe("fail")
    })
  })
})
