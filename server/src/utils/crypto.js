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
  const str = typeof rawBody === "string" ? rawBody : JSON.stringify(rawBody);
  const expectedHex = crypto.createHmac("sha256", secret).update(str).digest("hex");
  const expectedBase64 = crypto.createHmac("sha256", secret).update(str).digest("base64");
  try {
    const sigBuf = Buffer.from(signature, "utf-8");
    const hexBuf = Buffer.from(expectedHex, "utf-8");
    if (sigBuf.length === hexBuf.length && crypto.timingSafeEqual(sigBuf, hexBuf)) {
      return true;
    }
    const b64Buf = Buffer.from(expectedBase64, "utf-8");
    if (sigBuf.length === b64Buf.length && crypto.timingSafeEqual(sigBuf, b64Buf)) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

