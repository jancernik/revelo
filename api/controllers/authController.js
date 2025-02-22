import bcrypt from "bcryptjs";
import { UserTable, RevokedTokenTable } from "../drizzle/schema.js";
import {
  generateAccessToken,
  generateRefreshToken,
  setRefreshTokenCookie,
  verifyRefreshToken
} from "../utils/authUtils.js";
import { count, eq } from "drizzle-orm";
import { db } from "../db.js";
import { config } from "../config.js";

export const signupUser = async (req, res) => {
  if (config.ENABLE_SIGNUP !== "true") {
    return res.status(403).json({ message: "Signup is disabled." });
  }

  const { email, username, password } = req.body;
  if (!email || !username || !password) return res.status(400).json({ message: "Missing fields." });

  const emailExists = await db.select().from(UserTable).where(eq(UserTable.email, email));
  if (emailExists.length > 0) {
    return res.status(400).json({ message: "Email already used." });
  }

  const usernameExists = await db.select().from(UserTable).where(eq(UserTable.username, username));
  if (usernameExists.length > 0) {
    return res.status(400).json({ message: "Username already used." });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const adminCount = await db
    .select({ count: count() })
    .from(UserTable)
    .where(eq(UserTable.admin, true));
  const isAdmin = adminCount[0].count < config.MAX_ADMINS;

  const [newUser] = await db
    .insert(UserTable)
    .values({
      email,
      username,
      password: hashedPassword,
      admin: isAdmin
    })
    .returning({
      id: UserTable.id,
      email: UserTable.email,
      username: UserTable.username,
      admin: UserTable.admin
    });

  const accessToken = generateAccessToken(newUser);
  const refreshToken = generateRefreshToken(newUser);

  setRefreshTokenCookie(res, refreshToken);

  res.status(201).json({
    message: "User created successfully.",
    user: { email, username, admin: isAdmin },
    accessToken
  });
};

export const loginUser = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Missing fields." });
  }

  const [user] = await db.select().from(UserTable).where(eq(UserTable.username, username));
  if (!user) return res.status(401).json({ message: "Invalid credentials." });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ message: "Invalid credentials." });

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  setRefreshTokenCookie(res, refreshToken);

  res.json({
    message: "Logged in successfully.",
    user: { email: user.email, username: user.username, admin: user.admin },
    accessToken
  });
};

export const logoutUser = async (req, res) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    return res.status(400).json({ message: "Missing fields." });
  }

  await db.insert(RevokedTokenTable).values({ token: refreshToken });

  res.clearCookie("refreshToken");
  res.json({ message: "Logged out successfully." });
};

export const refreshToken = async (req, res) => {
  const { refreshToken } = req.cookies;
  if (!refreshToken) return res.status(401).json({ message: "Invalid credentials." });

  const revokedToken = await db
    .select()
    .from(RevokedTokenTable)
    .where(eq(RevokedTokenTable.token, refreshToken));

  if (revokedToken.length > 0) {
    res.clearCookie("refreshToken");
    return res.status(403).json({ message: "Invalid refresh token." });
  }

  verifyRefreshToken(refreshToken, (error, user) => {
    if (error) {
      res.clearCookie("refreshToken");
      return res.status(401).json({ message: "Session expired." });
    }

    const accessToken = generateAccessToken(user);
    res.json({ accessToken });
  });
};
