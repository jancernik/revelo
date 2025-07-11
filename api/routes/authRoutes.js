import { Router } from "express";

import {
  login,
  logout,
  refresh,
  resendVerificationEmail,
  signup,
  verifyEmail
} from "../controllers/authController.js";
import { validateBody } from "../middlewares/validationMiddleware.js";
import {
  loginSchema,
  resendVerificationSchema,
  signupSchema,
  verifyEmailSchema
} from "../validation/authSchemas.js";

const router = Router();

router.post("/signup", validateBody(signupSchema), signup);
router.post("/login", validateBody(loginSchema), login);
router.post("/logout", logout);
router.post("/refresh", refresh);
router.post("/verify-email", validateBody(verifyEmailSchema), verifyEmail);
router.post("/resend-verification", validateBody(resendVerificationSchema), resendVerificationEmail);

export default router;
