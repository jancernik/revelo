import {
  login,
  logout,
  refresh,
  resendVerificationEmail,
  signup,
  verifyEmail
} from "#src/controllers/authController.js"
import { validate } from "#src/middlewares/validationMiddleware.js"
import {
  loginSchemas,
  resendVerificationEmailSchemas,
  signupSchemas,
  verifyEmailSchemas
} from "#src/validation/authSchemas.js"
import { Router } from "express"

const router = Router()

router.post("/signup", validate(signupSchemas), signup)
router.post("/login", validate(loginSchemas), login)
router.post("/logout", logout)
router.post("/refresh", refresh)
router.post("/verify-email", validate(verifyEmailSchemas), verifyEmail)
router.post(
  "/resend-verification",
  validate(resendVerificationEmailSchemas),
  resendVerificationEmail
)

export default router
