import { Router } from "express"

import {
  getSetting,
  getSettings,
  resetSetting,
  updateSettings
} from "../controllers/settingController.js"
import { auth } from "../middlewares/authMiddleware.js"
import { validate } from "../middlewares/validationMiddleware.js"
import {
  getSettingSchemas,
  getSettingsSchemas,
  resetSettingSchemas,
  updateSettingsSchemas
} from "../validation/settingSchemas.js"

const router = Router()

router.get("/settings", auth.optional(), validate(getSettingsSchemas), getSettings)
router.get("/settings/:name", auth.optional(), validate(getSettingSchemas), getSetting)
router.put("/settings", auth.required(), validate(updateSettingsSchemas), updateSettings)
router.delete("/settings/:name", auth.required(), validate(resetSettingSchemas), resetSetting)

export default router
