import { verifyAccessToken } from "../utils/token.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    throw ApiError.unauthorized("Authentication required. Please provide a Bearer access token.");
  }

  const decoded = verifyAccessToken(token);

  const user = await User.findById(decoded.id).populate("roles");
  if (!user) {
    throw ApiError.unauthorized("User account associated with this token no longer exists.");
  }

  if (user.status !== "active") {
    throw ApiError.forbidden("This account is currently suspended or inactive.");
  }

  if (user.lockUntil && user.lockUntil > new Date()) {
    throw ApiError.forbidden("This account is temporarily locked due to excessive failed attempts.");
  }

  req.user = user;
  next();
});

export const optionalAuthenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id).populate("roles");
    if (user && user.status === "active") {
      req.user = user;
    } else {
      req.user = null;
    }
  } catch {
    req.user = null;
  }

  next();
});

export const requireStaff = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw ApiError.unauthorized("Staff authentication required.");
  }

  if (!req.user.isStaff) {
    throw ApiError.forbidden("Access restricted to authorized store staff.");
  }

  if (req.user.status !== "active") {
    throw ApiError.forbidden("Staff account is not active.");
  }

  next();
});

