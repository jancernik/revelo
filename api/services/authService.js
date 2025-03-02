import User from "../models/User.js";
import Setting from "../models/Setting.js";
import RevokedToken from "../models/RevokedToken.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
} from "../utils/authUtils.js";
import { eq } from "drizzle-orm";

export const signup = async ({ email, username, password }) => {
  const enableSignups = await Setting.get("enableSignups");
  if (!enableSignups) {
    throw new Error("Signup is disabled.");
  }

  if (!email || !username || !password) {
    throw new Error("Missing fields.");
  }

  const emailExists = await User.findByEmail(email);
  if (emailExists) {
    throw new Error("Email already used.");
  }

  const usernameExists = await User.findByUsername(username);
  if (usernameExists) {
    throw new Error("Username already used.");
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

  const accessToken = generateAccessToken(newUser);
  const refreshToken = generateRefreshToken(newUser);

  return { newUser, accessToken, refreshToken };
};

export const login = async ({ username, password }) => {
  if (!username || !password) {
    throw new Error("Missing fields.");
  }

  const user = await await User.findByUsername(username);
  if (!user) {
    throw new Error("Invalid credentials.");
  }

  const match = await User.verifyPassword(user, password);
  if (!match) {
    throw new Error("Invalid credentials.");
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  return { user, accessToken, refreshToken };
};

export const logout = async (refreshToken) => {
  if (!refreshToken) {
    throw new Error("Missing refresh token.");
  }

  await RevokedToken.create({ token: refreshToken });
};

export const refresh = async (refreshToken) => {
  if (!refreshToken) {
    throw new Error("Invalid credentials.");
  }

  const revokedToken = await RevokedToken.find(eq(RevokedToken.table.token, refreshToken));

  if (revokedToken) {
    throw new Error("Invalid refresh token.");
  }

  return new Promise((resolve, reject) => {
    verifyRefreshToken(refreshToken, (error, user) => {
      if (error) {
        reject(new Error("Session expired."));
      } else {
        const accessToken = generateAccessToken(user);
        resolve(accessToken);
      }
    });
  });
};
