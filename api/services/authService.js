// src/services/authService.js
import User from "../models/User.js";
import Setting from "../models/Setting.js";
import RevokedToken from "../models/RevokedToken.js";
import { generateAccess, generateRefresh, verifyRefresh } from "../utils/tokenUtils.js";
import { ValidationError, AuthenticationError, NotFoundError } from "../utils/errors.js";
import { eq } from "drizzle-orm";

export const signup = async ({ email, username, password }) => {
  const enableSignups = await Setting.get("enableSignups");
  if (!enableSignups) {
    throw new ValidationError("Signup is disabled.");
  }

  // These checks are now handled by Zod, but keeping them as a secondary check
  if (!email || !username || !password) {
    throw new ValidationError("Email, username, and password are required.");
  }

  const emailExists = await User.findByEmail(email);
  if (emailExists) {
    throw new ValidationError("Email already in use.");
  }

  const usernameExists = await User.findByUsername(username);
  if (usernameExists) {
    throw new ValidationError("Username already in use.");
  }

  const adminCount = await User.count(eq(User.table.admin, true));
  const maxAdmins = await Setting.get("maxAdmins");
  const isAdmin = adminCount < maxAdmins;

  const newUser = await User.create({
    email,
    username,
    password,
    admin: isAdmin
  });

  const accessToken = generateAccess(newUser);
  const refreshToken = generateRefresh(newUser);

  return { newUser, accessToken, refreshToken };
};

export const login = async ({ username, password }) => {
  if (!username || !password) {
    throw new ValidationError("Username and password are required.");
  }

  const user = await User.findByUsername(username);
  if (!user) {
    throw new AuthenticationError("Invalid credentials.");
  }

  const match = await User.verifyPassword(user, password);
  if (!match) {
    throw new AuthenticationError("Invalid credentials.");
  }

  const accessToken = generateAccess(user);
  const refreshToken = generateRefresh(user);

  return { user, accessToken, refreshToken };
};

export const logout = async (refreshToken) => {
  if (!refreshToken) {
    throw new ValidationError("Missing refresh token.");
  }

  await RevokedToken.create({ token: refreshToken });
};

export const refresh = async (refreshToken) => {
  if (!refreshToken) {
    throw new AuthenticationError("Missing refresh token.");
  }

  const revokedToken = await RevokedToken.find(eq(RevokedToken.table.token, refreshToken));

  if (revokedToken) {
    throw new AuthenticationError("Invalid or revoked refresh token.");
  }

  return new Promise((resolve, reject) => {
    verifyRefresh(refreshToken, (error, user) => {
      if (error) {
        reject(new AuthenticationError("Session expired."));
      } else {
        const accessToken = generateAccess(user);
        resolve(accessToken);
      }
    });
  });
};