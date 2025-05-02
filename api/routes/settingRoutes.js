import { Router } from "express";
import {
  getSettings,
  getSetting,
  updateSetting,
  resetSetting
} from "../controllers/settingController.js";
import { optionalAuth, requireAuth, loadUser } from "../middlewares/authMiddleware.js";

const router = Router();

router.get("/settings", optionalAuth, loadUser, getSettings);
router.get("/settings/:name", optionalAuth, loadUser, getSetting);
router.put("/settings/:name", requireAuth, loadUser, updateSetting);
router.delete("/settings/:name", requireAuth, loadUser, resetSetting);

export default router;
