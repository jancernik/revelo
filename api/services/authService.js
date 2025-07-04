import { eq } from "drizzle-orm";

import EmailVerificationToken from "../models/EmailVerificationToken.js";
import RevokedToken from "../models/RevokedToken.js";
import Setting from "../models/Setting.js";
import User from "../models/User.js";
import { generateAccess, generateRefresh, verifyRefresh } from "../utils/tokenUtils.js";
import { sendVerificationEmail, sendWelcomeEmail } from "./emailService.js";

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
  const isAdmin = adminCount < maxAdmins?.value;

  const newUser = await User.create({
    admin: isAdmin,
    email,
    password,
    username
  });

  const verificationToken = await EmailVerificationToken.createToken(newUser.id, email);

  try {
    sendVerificationEmail(email, verificationToken.token, username);
  } catch (error) {
    console.error("Failed to send verification email:", error);
  }

  return {
    requiresVerification: true,
    user: newUser
  };
};

export const verifyEmail = async (token) => {
  if (!token) {
    throw new Error("Verification token is required.");
  }

  const verificationToken = await EmailVerificationToken.findValidToken(token);
  if (!verificationToken) {
    throw new Error("Invalid or expired verification token.");
  }

  const user = await User.findById(verificationToken.userId);
  if (!user) {
    throw new Error("User not found.");
  }

  if (user.emailVerified) {
    throw new Error("Email is already verified.");
  }

  await User.markEmailVerified(user.id);
  await EmailVerificationToken.markTokenUsed(token);

  try {
    sendWelcomeEmail(user.email, user.username);
  } catch (error) {
    console.error("Failed to send welcome email:", error);
  }

  const updatedUser = { ...user, emailVerified: true };
  const accessToken = generateAccess(updatedUser);
  const refreshToken = generateRefresh(updatedUser);

  return {
    accessToken,
    refreshToken,
    user: updatedUser
  };
};

export const resendVerificationEmail = async (email) => {
  if (!email) {
    throw new Error("Email is required.");
  }

  const user = await User.findByEmail(email);
  if (!user) {
    throw new Error("User not found.");
  }

  if (user.emailVerified) {
    throw new Error("Email is already verified.");
  }

  const verificationToken = await EmailVerificationToken.createToken(user.id, email);
  await sendVerificationEmail(email, verificationToken.token, user.username);

  return { message: "Verification email sent!" };
};

export const login = async ({ password, username }) => {
  if (!username || !password) {
    throw new Error("Missing fields.");
  }

  const user = await User.findByUsername(username);
  if (!user) {
    throw new Error("Invalid credentials.");
  }

  const match = await User.verifyPassword(user, password);
  if (!match) {
    throw new Error("Invalid credentials.");
  }

  if (!user.emailVerified) {
    const error = new Error("Email not verified.");
    error.user = user;
    error.requiresVerification = true;
    throw error;
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
