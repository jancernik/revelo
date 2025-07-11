import { Router } from "express";

import {
  getSetting,
  getSettings,
  resetSetting,
  updateMultipleSettings,
  updateSetting
} from "../controllers/settingController.js";
import { auth } from "../middlewares/authMiddleware.js";

const router = Router();

router.get("/settings", auth.required(), getSettings);
router.get("/public-settings", auth.optional(), getSettings);
router.get("/settings/:name", auth.optional(), getSetting);
router.put("/settings/:name", auth.required(), updateSetting);
router.put("/settings", auth.required(), updateMultipleSettings);
router.delete("/settings/:name", auth.required(), resetSetting);

export default router;
