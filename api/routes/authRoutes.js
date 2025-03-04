// src/routes/authRoutes.js
import { Router } from "express";
import { signup, login, logout, refresh } from "../controllers/authController.js";
import { validateRequest, signupSchema, loginSchema } from "../validations/userValidation.js";

const router = Router();

router.post("/signup", validateRequest(signupSchema), signup);
router.post("/login", validateRequest(loginSchema), login);
router.post("/logout", logout);
router.post("/refresh", refresh);

export default router;