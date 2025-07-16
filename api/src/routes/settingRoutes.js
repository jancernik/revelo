import {
  getSetting,
  getSettings,
  resetSetting,
  updateSettings
} from "#src/controllers/settingController.js"
import { auth } from "#src/middlewares/authMiddleware.js"
import { validate } from "#src/middlewares/validationMiddleware.js"
import {
  getSettingSchemas,
  getSettingsSchemas,
  resetSettingSchemas,
  updateSettingsSchemas
} from "#src/validation/settingSchemas.js"
import { Router } from "express"

const router = Router()

router.get("/settings", auth.optional(), validate(getSettingsSchemas), getSettings)
router.get("/settings/:name", auth.optional(), validate(getSettingSchemas), getSetting)
router.put("/settings", auth.required(), validate(updateSettingsSchemas), updateSettings)
router.delete("/settings/:name", auth.required(), validate(resetSettingSchemas), resetSetting)

export default router
