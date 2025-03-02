import { config } from "../config.js";
import jwt from "jsonwebtoken";

const ACCESS_EXPIRATION = 15; // minutes
const REFRESH_EXPIRATION = 90; // days

export const generateAccess = (user) => {
  return jwt.sign({ id: user.id }, config.JWT_SECRET, { expiresIn: `${ACCESS_EXPIRATION}m` });
};

export const generateRefresh = (user) => {
  return jwt.sign({ id: user.id }, config.JWT_REFRESH_SECRET, {
    expiresIn: `${REFRESH_EXPIRATION}d`
  });
};

export const setRefreshCookie = (res, refreshToken) => {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: config.ENV === "production",
    sameSite: "Strict",
    maxAge: REFRESH_EXPIRATION * 24 * 60 * 60 * 1000
  });
};

export const verifyRefresh = (token, callback) => {
  jwt.verify(token, config.JWT_REFRESH_SECRET, (error, user) => {
    if (error) {
      return callback(error, null);
    }
    callback(null, user);
  });
};
