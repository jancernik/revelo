import { Router } from "express";

import {
  getSetting,
  getSettings,
  resetSetting,
  updateMultipleSettings,
  updateSetting
} from "../controllers/settingController.js";
import { loadUser, optionalAuth, requireAuth } from "../middlewares/authMiddleware.js";

const router = Router();

router.get("/settings", requireAuth, loadUser, getSettings);
router.get("/public-settings", optionalAuth, loadUser, getSettings);
router.get("/settings/:name", optionalAuth, loadUser, getSetting);
router.put("/settings/:name", requireAuth, loadUser, updateSetting);
router.put("/settings", requireAuth, loadUser, updateMultipleSettings);
router.delete("/settings/:name", requireAuth, loadUser, resetSetting);

export default router;
