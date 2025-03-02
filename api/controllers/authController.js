import * as authService from "../services/authService.js";
import { setRefreshCookie } from "../utils/tokenUtils.js";

export const signup = async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const { newUser, accessToken, refreshToken } = await authService.signup({
      email,
      username,
      password
    });

    setRefreshCookie(res, refreshToken);

    res.status(201).json({
      message: "User created successfully.",
      user: { email, username, admin: newUser.admin },
      accessToken
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const { user, accessToken, refreshToken } = await authService.login({ username, password });

    setRefreshCookie(res, refreshToken);

    res.json({
      message: "Logged in successfully.",
      user: { email: user.email, username: user.username, admin: user.admin },
      accessToken
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
