import { Router } from "express";
import { signup, login, logout, refresh } from "../controllers/authController.js";
import { optionalAuth, loadUser, currentUser } from "../middlewares/authMiddleware.js";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh", refresh);
router.get("/current-user", optionalAuth, loadUser, currentUser);

export default router;
