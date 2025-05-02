import { Router } from "express";
import {
  getSettings,
  getSetting,
  updateSetting,
  resetSetting
} from "../controllers/settingController.js";
import { optionalAuth, requireAuth } from "../middlewares/authMiddleware.js";

const router = Router();

router.get("/settings", optionalAuth, getSettings);
router.get("/settings/:name", optionalAuth, getSetting);
router.put("/settings/:name", requireAuth, updateSetting);
router.delete("/settings/:name", requireAuth, resetSetting);

export default router;
