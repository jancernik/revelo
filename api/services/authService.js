import { eq } from "drizzle-orm";

import RevokedToken from "../models/RevokedToken.js";
import Setting from "../models/Setting.js";
import User from "../models/User.js";
import { generateAccess, generateRefresh, verifyRefresh } from "../utils/tokenUtils.js";

export const signup = async ({ email, password, username }) => {
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
  const maxAdmins = await Setting.get("maxAdmins", { includeRestricted: true });
  const isAdmin = adminCount < maxAdmins;

  const newUser = await User.create({
    admin: isAdmin,
    email,
    password,
    username
  });

  const accessToken = generateAccess(newUser);
  const refreshToken = generateRefresh(newUser);

  return { accessToken, newUser, refreshToken };
};

export const login = async ({ password, username }) => {
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

  const accessToken = generateAccess(user);
  const refreshToken = generateRefresh(user);

  return { accessToken, refreshToken, user };
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
    verifyRefresh(refreshToken, (error, user) => {
      if (error) {
        reject(new Error("Session expired."));
      } else {
        const accessToken = generateAccess(user);
        resolve(accessToken);
      }
    });
  });
};
