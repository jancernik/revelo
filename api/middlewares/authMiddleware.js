import jwt from "jsonwebtoken";

import { config } from "../config.js";
import User from "../models/User.js";

export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, config.JWT_SECRET, (error, decoded) => {
    if (error) {
      req.user = null;
    } else {
      req.decoded = decoded;
    }
    next();
  });
};

export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authorization required" });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, config.JWT_SECRET, (error, decoded) => {
    if (error) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    req.decoded = decoded;
    next();
  });
};

export const loadUser = async (req, res, next) => {
  if (!req.decoded) {
    return next();
  }

  try {
    const user = await User.findById(req.decoded.id);
    User;

    if (!user) {
      req.user = null;
      return next();
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(500).json({
      error: error.message,
      message: "Error loading user data"
    });
  }
};

export const currentUser = async (req, res) => {
  if (!req.user) {
    return res.status(200).json({ user: {} });
  } else {
    res.status(200).json({
      user: {
        admin: req.user.admin,
        email: req.user.email,
        username: req.user.username
      }
    });
  }
};
