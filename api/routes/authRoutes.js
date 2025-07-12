import { Router } from "express";

import {
  login,
  logout,
  refresh,
  resendVerificationEmail,
  signup,
  verifyEmail
} from "../controllers/authController.js";
import { validate } from "../middlewares/validationMiddleware.js";
import {
  loginSchemas,
  resendVerificationEmailSchemas,
  signupSchemas,
  verifyEmailSchemas
} from "../validation/authSchemas.js";

const router = Router();

router.post("/signup", validate(signupSchemas), signup);
router.post("/login", validate(loginSchemas), login);
router.post("/logout", logout);
router.post("/refresh", refresh);
router.post("/verify-email", validate(verifyEmailSchemas), verifyEmail);
router.post(
  "/resend-verification",
  validate(resendVerificationEmailSchemas),
  resendVerificationEmail
);

export default router;
