import * as authService from "../services/authService.js";
import { setRefreshCookie } from "../utils/tokenUtils.js";

export const signup = async (req, res) => {
  try {
    const { email, password, username } = req.body;
    const { accessToken, newUser, refreshToken } = await authService.signup({
      email,
      password,
      username
    });

    setRefreshCookie(res, refreshToken);

    res.status(201).json({
      accessToken,
      message: "User created successfully.",
      user: { admin: newUser.admin, email, username }
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { password, username } = req.body;
    const { accessToken, refreshToken, user } = await authService.login({ password, username });

    setRefreshCookie(res, refreshToken);

    res.json({
      accessToken,
      message: "Logged in successfully.",
      user: { admin: user.admin, email: user.email, username: user.username }
    });
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    await authService.logout(refreshToken);

    res.clearCookie("refreshToken");
    res.json({ message: "Logged out successfully." });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    const accessToken = await authService.refresh(refreshToken);

    res.json({ accessToken });
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};
