import crypto from "crypto";
import { User } from "../models/User.js";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to keep codes readable when shared

// DIVYAM + up to 3 letters of the name + 4 random characters, checked for uniqueness
export const generateReferralCode = async (name = "") => {
  const letters = String(name).replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 3) || "AYU";
  for (let attempt = 0; attempt < 10; attempt++) {
    const suffix = Array.from(crypto.randomBytes(4), (b) => ALPHABET[b % ALPHABET.length]).join("");
    const code = `DIVYAM${letters}${suffix}`;
    if (!(await User.exists({ referralCode: code }))) return code;
  }
  return `DIVYAM${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
};
