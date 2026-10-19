import crypto from "crypto";
import bcrypt from "bcryptjs";
import { config } from "../config/index.js";

const SALT_ROUNDS = 10;

export const hashPassword = async (password) => {
  const pepperedPassword = `${password}${config.PASSWORD_PEPPER}`;
  return bcrypt.hash(pepperedPassword, SALT_ROUNDS);
};

export const comparePassword = async (password, hash) => {
  const pepperedPassword = `${password}${config.PASSWORD_PEPPER}`;
  return bcrypt.compare(pepperedPassword, hash);
};

export const sha256 = (data) => {
  const str = typeof data === "string" ? data : JSON.stringify(data);
  return crypto.createHash("sha256").update(str).digest("hex");
};

export const hmacSha256 = (data, secret) => {
  const str = typeof data === "string" ? data : JSON.stringify(data);
  return crypto.createHmac("sha256", secret).update(str).digest("hex");
};

export const generateSecureToken = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString("hex");
};

export const verifyHmacSignature = (rawBody, signature, secret) => {
  if (!signature || !secret) return false;
  const expectedSignature = hmacSha256(rawBody, secret);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, "utf-8"),
      Buffer.from(expectedSignature, "utf-8")
    );
  } catch {
    return false;
  }
};

