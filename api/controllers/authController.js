import * as authService from "../services/authService.js";
import { setRefreshCookie } from "../utils/tokenUtils.js";

export const signup = async (req, res) => {
  try {
    const { email, password, username } = req.body;
    const { user } = await authService.signup({ email, password, username });
    res.status(201).json({
      message: "User created successfully.",
      requiresVerification: true,
      user: {
        admin: user.admin,
        email: user.email,
        emailVerified: user.emailVerified,
        username: user.username
      }
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    const { accessToken, refreshToken, user } = await authService.verifyEmail(token);

    setRefreshCookie(res, refreshToken);

    res.status(200).json({
      accessToken,
      message: "Email verified successfully",
      user: {
        admin: user.admin,
        email: user.email,
        emailVerified: user.emailVerified,
        username: user.username
      }
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;
    const result = await authService.resendVerificationEmail(email);
    res.status(200).json({ message: result.message });
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
      user: {
        admin: user.admin,
        email: user.email,
        emailVerified: user.emailVerified,
        username: user.username
      }
    });
  } catch (error) {
    if (error.requiresVerification) {
      const user = {
        admin: error.user.admin,
        email: error.user.email,
        emailVerified: error.user.emailVerified,
        username: error.user.username
      };

      res.status(401).json({ message: error.message, requiresVerification: true, user });
    } else {
      res.status(401).json({ message: error.message });
    }
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
