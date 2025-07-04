import { Router } from "express";

import {
  login,
  logout,
  refresh,
  resendVerificationEmail,
  signup,
  verifyEmail
} from "../controllers/authController.js";
import { currentUser, loadUser, optionalAuth } from "../middlewares/authMiddleware.js";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh", refresh);
router.post("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerificationEmail);
router.get("/current-user", optionalAuth, loadUser, currentUser);

export default router;
