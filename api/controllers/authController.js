import {
  signupUserService,
  loginUserService,
  logoutUserService,
  refreshTokenService
} from "../services/authService.js";
import { setRefreshTokenCookie } from "../utils/authUtils.js";

export const signupUser = async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const { newUser, accessToken, refreshToken } = await signupUserService({
      email,
      username,
      password
    });

    setRefreshTokenCookie(res, refreshToken);

    res.status(201).json({
      message: "User created successfully.",
      user: { email, username, admin: newUser.admin },
      accessToken
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;
    const { user, accessToken, refreshToken } = await loginUserService({ username, password });

    setRefreshTokenCookie(res, refreshToken);

    res.json({
      message: "Logged in successfully.",
      user: { email: user.email, username: user.username, admin: user.admin },
      accessToken
    });
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};

export const logoutUser = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    await logoutUserService(refreshToken);

    res.clearCookie("refreshToken");
    res.json({ message: "Logged out successfully." });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    const accessToken = await refreshTokenService(refreshToken);

    res.json({ accessToken });
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};
