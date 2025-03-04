// src/controllers/authController.js
import * as authService from "../services/authService.js";
import { setRefreshCookie } from "../utils/tokenUtils.js";
import { asyncHandler } from '../utils/errors.js';

export const signup = asyncHandler(async (req, res) => {
  // No need for try/catch as asyncHandler will catch errors
  const { email, username, password } = req.validatedData;
  const { newUser, accessToken, refreshToken } = await authService.signup({
    email,
    username,
    password
  });

  setRefreshCookie(res, refreshToken);

  res.status(201).json({
    status: 'success',
    message: "User created successfully.",
    data: {
      user: { 
        id: newUser.id,
        email, 
        username, 
        admin: newUser.admin 
      },
      accessToken
    }
  });
});

export const login = asyncHandler(async (req, res) => {
  const { username, password } = req.validatedData;
  const { user, accessToken, refreshToken } = await authService.login({ 
    username, 
    password 
  });

  setRefreshCookie(res, refreshToken);

  res.json({
    status: 'success',
    message: "Logged in successfully.",
    data: {
      user: { 
        id: user.id,
        email: user.email, 
        username: user.username, 
        admin: user.admin 
      },
      accessToken
    }
  });
});

export const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.cookies;
  await authService.logout(refreshToken);

  res.clearCookie("refreshToken");
  res.json({ 
    status: 'success',
    message: "Logged out successfully." 
  });
});

export const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.cookies;
  const accessToken = await authService.refresh(refreshToken);

  res.json({ 
    status: 'success',
    data: { accessToken }
  });
});