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
import { validate } from "../middlewares/validationMiddleware.js";
import {
  loginSchema,
  resendVerificationSchema,
  signupSchema,
  verifyEmailSchema
} from "../validation/authSchemas.js";

const router = Router();

router.post("/signup", validate(signupSchema), signup);
router.post("/login", validate(loginSchema), login);
router.post("/logout", logout);
router.post("/refresh", refresh);
router.post("/verify-email", validate(verifyEmailSchema), verifyEmail);
router.post("/resend-verification", validate(resendVerificationSchema), resendVerificationEmail);
router.get("/current-user", optionalAuth, loadUser, currentUser);

export default router;
