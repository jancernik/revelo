import { Router } from "express";
import {
  getSettings,
  getSetting,
  updateSetting,
  updateMultipleSettings,
  resetSetting
} from "../controllers/settingController.js";
import { optionalAuth, requireAuth, loadUser } from "../middlewares/authMiddleware.js";

const router = Router();

router.get("/settings", requireAuth, loadUser, getSettings);
router.get("/public-settings", optionalAuth, loadUser, getSettings);
router.get("/settings/:name", optionalAuth, loadUser, getSetting);
router.put("/settings/:name", requireAuth, loadUser, updateSetting);
router.put("/settings", requireAuth, loadUser, updateMultipleSettings);
router.delete("/settings/:name", requireAuth, loadUser, resetSetting);

export default router;
