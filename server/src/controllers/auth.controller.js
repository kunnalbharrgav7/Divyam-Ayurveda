import { authService } from "../services/auth.service.js";
import { sendSuccess } from "../utils/response.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { config } from "../config/index.js";

export const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);

  if (config.COOKIE_SECURE || req.secure) {
    res.cookie("refreshToken", result.tokens.refreshToken, {
      httpOnly: true,
      secure: config.COOKIE_SECURE,
      sameSite: "Lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }

  return sendSuccess(res, result, undefined, 201);
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login({
    email: req.body.email,
    password: req.body.password,
    isStaffRequired: false,
  });

  res.cookie("accessToken", result.tokens.accessToken, {
    httpOnly: true,
    secure: config.COOKIE_SECURE,
    sameSite: "Lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.cookie("refreshToken", result.tokens.refreshToken, {
    httpOnly: true,
    secure: config.COOKIE_SECURE,
    sameSite: "Lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  return sendSuccess(res, result);
});

export const staffLogin = asyncHandler(async (req, res) => {
  const result = await authService.login({
    email: req.body.email,
    password: req.body.password,
    isStaffRequired: true,
  });

  res.cookie("accessToken", result.tokens.accessToken, {
    httpOnly: true,
    secure: config.COOKIE_SECURE,
    sameSite: "Lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.cookie("refreshToken", result.tokens.refreshToken, {
    httpOnly: true,
    secure: config.COOKIE_SECURE,
    sameSite: "Lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  return sendSuccess(res, result);
});

export const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;
  const result = await authService.refreshToken(token);

  res.cookie("accessToken", result.accessToken, {
    httpOnly: true,
    secure: config.COOKIE_SECURE,
    sameSite: "Lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.cookie("refreshToken", result.refreshToken, {
    httpOnly: true,
    secure: config.COOKIE_SECURE,
    sameSite: "Lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  return sendSuccess(res, result);
});

export const logout = asyncHandler(async (req, res) => {
  if (req.user) {
    await authService.logout(req.user._id);
  }
  // Clear both session cookies so this browser is fully signed out (header-less requests included)
  const cookieOptions = { httpOnly: true, secure: config.COOKIE_SECURE, sameSite: "Lax" };
  res.clearCookie("accessToken", cookieOptions);
  res.clearCookie("refreshToken", cookieOptions);
  return sendSuccess(res, { message: "Logged out successfully." });
});

export const getProfile = asyncHandler(async (req, res) => {
  const profile = await authService.getProfile(req.user._id);
  return sendSuccess(res, profile);
});

export const updateProfile = asyncHandler(async (req, res) => {
  const updated = await authService.updateProfile(req.user._id, req.body);
  return sendSuccess(res, updated);
});

export const changePassword = asyncHandler(async (req, res) => {
  const result = await authService.changePassword(
    req.user._id,
    req.body.currentPassword,
    req.body.newPassword
  );
  return sendSuccess(res, result);
});

export const getAddresses = asyncHandler(async (req, res) => {
  const user = await authService.getProfile(req.user._id);
  return sendSuccess(res, user.addresses || []);
});

export const addAddress = asyncHandler(async (req, res) => {
  const address = await authService.addAddress(req.user._id, req.body);
  return sendSuccess(res, address, undefined, 201);
});

export const updateAddress = asyncHandler(async (req, res) => {
  const address = await authService.updateAddress(req.user._id, req.params.addressId, req.body);
  return sendSuccess(res, address);
});

export const deleteAddress = asyncHandler(async (req, res) => {
  const result = await authService.deleteAddress(req.user._id, req.params.addressId);
  return sendSuccess(res, result);
});

export const setDefaultAddress = asyncHandler(async (req, res) => {
  const addresses = await authService.setDefaultAddress(req.user._id, req.params.addressId);
  return sendSuccess(res, addresses);
});

