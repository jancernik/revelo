import { Router } from "express";
import { signupUser, loginUser, logoutUser, refreshToken } from "../controllers/authController.js";

const router = Router();

router.post("/signup", async (req, res) => {
  try {
    await signupUser(req, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error signing up user.", error });
  }
});

router.post("/login", async (req, res) => {
  try {
    await loginUser(req, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error logging in user.", error });
  }
});

router.post("/logout", async (req, res) => {
  try {
    await logoutUser(req, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error logging out user.", error });
  }
});

router.post("/refresh", async (req, res) => {
  try {
    await refreshToken(req, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error refreshing access token.", error });
  }
});

export default router;
