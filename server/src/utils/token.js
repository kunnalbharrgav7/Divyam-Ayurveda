import jwt from "jsonwebtoken";
import { config } from "../config/index.js";
import { ApiError } from "./apiError.js";

export const generateAccessToken = (payload) => {
  return jwt.sign(payload, config.JWT_ACCESS_SECRET, {
    expiresIn: config.JWT_ACCESS_TTL,
  });
};

export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, config.JWT_REFRESH_SECRET, {
    expiresIn: config.JWT_REFRESH_TTL,
  });
};

export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, config.JWT_ACCESS_SECRET);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw ApiError.unauthorized("Access token has expired", { expired: true });
    }
    throw ApiError.unauthorized("Invalid access token");
  }
};

export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, config.JWT_REFRESH_SECRET);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw ApiError.unauthorized("Refresh token has expired", { expired: true });
    }
    throw ApiError.unauthorized("Invalid refresh token");
  }
};

