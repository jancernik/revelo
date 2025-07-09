import { userSerializer } from "../models/User.js";
import * as authService from "../services/authService.js";
import { setRefreshCookie } from "../utils/tokenUtils.js";

export const signup = async (req, res) => {
  const { email, password, username } = req.body;
  const { user } = await authService.signup({ email, password, username });
  res.status(201).json({
    message: "User created successfully.",
    requiresVerification: true,
    user: userSerializer(user)
  });
};

export const verifyEmail = async (req, res) => {
  const { token } = req.body;
  const { accessToken, refreshToken, user } = await authService.verifyEmail(token);

  setRefreshCookie(res, refreshToken);

  res.status(200).json({
    accessToken,
    message: "Email verified successfully",
    user: userSerializer(user)
  });
};

export const resendVerificationEmail = async (req, res) => {
  const { email } = req.body;
  const result = await authService.resendVerificationEmail(email);
  res.status(200).json({ message: result.message });
};

export const login = async (req, res) => {
  const { password, username } = req.body;
  const { accessToken, refreshToken, user } = await authService.login({ password, username });

  setRefreshCookie(res, refreshToken);

  res.json({
    accessToken,
    message: "Logged in successfully.",
    user: userSerializer(user)
  });
};

export const logout = async (req, res) => {
  const { refreshToken } = req.cookies;
  await authService.logout(refreshToken);

  res.clearCookie("refreshToken");
  res.json({ message: "Logged out successfully." });
};

export const refresh = async (req, res) => {
  const { refreshToken } = req.cookies;
  const accessToken = await authService.refresh(refreshToken);

  res.json({ accessToken });
};
