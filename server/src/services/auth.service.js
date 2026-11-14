import { User } from "../models/User.js";
import { Role } from "../models/Role.js";
import { ApiError } from "../utils/apiError.js";
import { hashPassword, comparePassword, sha256 } from "../utils/crypto.js";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../utils/token.js";
import { ROLES } from "../constants/roles.js";
import { config } from "../config/index.js";
import { generateReferralCode } from "../utils/referralCode.js";
import { referralService } from "./referral.service.js";
import { logAudit } from "./audit.service.js";
import { parsePhone } from "../utils/phone.js";

// A throwaway hash so sign-ins for accounts that do not exist cost the same time as real ones
let dummyHashPromise = null;
const dummyHash = () => (dummyHashPromise ||= hashPassword(`not-a-real-password-${Date.now()}`));

export class AuthService {
  /**
   * Register a new customer
   */
  async register({ name, email, phoneCountryCode, phone, password, referralCode: invitedByCode = null }) {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      throw ApiError.conflict("An account with this email address already exists.");
    }

    // The schema already proved this is a real number for the country; this gives the canonical stored form
    const parsedPhone = parsePhone(phoneCountryCode, phone);
    if (!parsedPhone) throw ApiError.badRequest("Enter a valid mobile number for the selected country.");
    if (await User.exists({ phone: parsedPhone.phone })) {
      throw ApiError.conflict("An account with this mobile number already exists.");
    }

    const passwordHash = await hashPassword(password);
    const referralCode = await generateReferralCode(name);

    let user;
    try {
      user = await User.create({
        name,
        email: email.toLowerCase(),
        phone: parsedPhone.phone,
        phoneCountryCode: parsedPhone.phoneCountryCode,
        phoneNumber: parsedPhone.phoneNumber,
        phoneVerified: false,
        passwordHash,
        referralCode,
        isStaff: false,
        status: "active",
        addresses: [],
      });
    } catch (err) {
      // Two sign-ups racing for the same email or number: the unique indexes decide
      if (err.code === 11000) throw ApiError.conflict("An account with this email address or mobile number already exists.");
      throw err;
    }

    const accessToken = generateAccessToken({ id: user._id, email: user.email, isStaff: false, tv: user.tokenVersion ?? 0 });
    const refreshToken = generateRefreshToken({ id: user._id, tv: user.tokenVersion ?? 0 });

    user.refreshTokenHash = sha256(refreshToken);
    user.lastLoginAt = new Date();
    await user.save();

    // A friend's invitation code links this account to them (never blocks signup if it is not usable)
    const referral = await referralService.linkSignup(user, invitedByCode);

    return {
      user: user.toJSON(),
      tokens: {
        accessToken,
        refreshToken,
      },
      referral,
    };
  }

  /**
   * Authenticate customer or staff user
   */
  async login({ email, phoneCountryCode, phone, password, isStaffRequired = false }) {
    const byPhone = Boolean(phone);
    // One message for every failure (unknown account, wrong country code, wrong password) so nobody can probe
    // which emails or numbers have accounts
    const invalid = () =>
      ApiError.unauthorized(byPhone ? "Invalid mobile number or password." : "Invalid email address or password.");

    let query;
    if (byPhone) {
      // Staff sign in with email only, and the country code is part of the identity
      const parsed = isStaffRequired ? null : parsePhone(phoneCountryCode, phone);
      if (!parsed) {
        await comparePassword(String(password || ""), await dummyHash());
        throw invalid();
      }
      query = { phone: parsed.phone };
    } else {
      query = { email: String(email || "").toLowerCase() };
    }

    const user = await User.findOne(query).select("+passwordHash +refreshTokenHash").populate("roles");

    if (!user || (byPhone && user.isStaff)) {
      // Same work as a real check, so the response time does not reveal whether the account exists
      await comparePassword(String(password || ""), await dummyHash());
      throw invalid();
    }

    if (user.status !== "active") {
      throw ApiError.forbidden("Your account is currently suspended or pending verification.");
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      throw ApiError.forbidden("Account is temporarily locked. Please try again later.");
    }

    if (isStaffRequired && !user.isStaff) {
      throw ApiError.forbidden("Access denied: Not an authorized staff account.");
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min lock
      }
      await user.save();
      throw invalid();
    }

    // Reset failed login attempts on success
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.lastLoginAt = new Date();

    const accessToken = generateAccessToken({
      id: user._id,
      email: user.email,
      isStaff: user.isStaff,
      tv: user.tokenVersion ?? 0,
    });
    const refreshToken = generateRefreshToken({ id: user._id, tv: user.tokenVersion ?? 0 });

    user.refreshTokenHash = sha256(refreshToken);
    await user.save();

    return {
      user: user.toJSON(),
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  /**
   * Refresh expired access token using rotating refresh token
   */
  async refreshToken(refreshToken) {
    if (!refreshToken) {
      throw ApiError.unauthorized("Refresh token is required.");
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.id).select("+refreshTokenHash").populate("roles");

    if (!user || user.status !== "active") {
      throw ApiError.unauthorized("Invalid refresh session or inactive user.");
    }

    if ((decoded.tv ?? 0) !== (user.tokenVersion ?? 0)) {
      throw ApiError.unauthorized("Your session has ended. Please sign in again.");
    }

    const tokenHash = sha256(refreshToken);
    if (user.refreshTokenHash !== tokenHash) {
      // Possible token reuse attack; revoke active token
      user.refreshTokenHash = null;
      await user.save();
      throw ApiError.unauthorized("Refresh token has already been consumed or invalidated.");
    }

    const newAccessToken = generateAccessToken({
      id: user._id,
      email: user.email,
      isStaff: user.isStaff,
      tv: user.tokenVersion ?? 0,
    });
    const newRefreshToken = generateRefreshToken({ id: user._id, tv: user.tokenVersion ?? 0 });

    user.refreshTokenHash = sha256(newRefreshToken);
    await user.save();

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Revoke refresh session
   */
  async logout(userId) {
    await User.findByIdAndUpdate(userId, { refreshTokenHash: null });
    return { success: true };
  }

  /**
   * Retrieve current user profile
   */
  async getProfile(userId) {
    const user = await User.findById(userId).populate("roles");
    if (!user) throw ApiError.notFound("User not found");
    return user.toJSON();
  }

  /**
   * Update profile information
   */
  async updateProfile(userId, data) {
    const user = await User.findById(userId);
    if (!user) throw ApiError.notFound("User not found");

    if (data.name) user.name = data.name.trim();
    // The mobile number is a sign-in credential, so it is changed only through changePhone (needs the password)
    if (data.avatarUrl) user.avatarUrl = data.avatarUrl;

    await user.save();
    return user.toJSON();
  }

  /**
   * Change the mobile number of the signed-in account. Needs the current password (the number can be used to sign
   * in). The new number starts unverified.
   */
  async changePhone(userId, { phoneCountryCode, phone, currentPassword }) {
    const user = await this.#verifyCurrentPassword(userId, currentPassword);

    const parsed = parsePhone(phoneCountryCode, phone);
    if (!parsed) throw ApiError.badRequest("Enter a valid mobile number for the selected country.");
    if (parsed.phone === user.phone) throw ApiError.badRequest("That is already the mobile number on this account.");

    const unavailable = () => ApiError.conflict("This mobile number cannot be used. Please choose a different one.");
    if (await User.exists({ phone: parsed.phone, _id: { $ne: user._id } })) throw unavailable();

    try {
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            phone: parsed.phone,
            phoneCountryCode: parsed.phoneCountryCode,
            phoneNumber: parsed.phoneNumber,
            phoneVerified: false,
            failedLoginAttempts: 0,
            lockUntil: null,
          },
        }
      );
    } catch (err) {
      if (err.code === 11000) throw unavailable();
      throw err;
    }

    try {
      await logAudit({
        actorId: user._id,
        actorName: user.name,
        actorRole: user.isStaff ? "Staff" : "Customer",
        action: "auth.phone_change",
        module: "Account",
        targetId: String(user._id),
        details: `Changed their sign-in mobile number from ${user.phone || "none"} to ${parsed.phone}.`,
      });
    } catch (_) {
      // the audit trail must never block the change itself
    }

    const fresh = await User.findById(user._id);
    return fresh.toJSON();
  }

  /**
   * Check the password typed to authorise a sensitive change. Wrong guesses count towards the same lock-out as
   * signing in, so a stolen session cannot be used to guess the password. Returns the user with the hash loaded.
   */
  async #verifyCurrentPassword(userId, currentPassword) {
    const user = await User.findById(userId).select("+passwordHash");
    if (!user) throw ApiError.notFound("User not found");

    if (user.lockUntil && user.lockUntil > new Date()) {
      throw ApiError.forbidden("This account is temporarily locked after too many wrong passwords. Please try again later.");
    }

    const isMatch = await comparePassword(String(currentPassword || ""), user.passwordHash);
    if (!isMatch) {
      const attempts = (user.failedLoginAttempts || 0) + 1;
      await User.updateOne(
        { _id: user._id },
        { $set: { failedLoginAttempts: attempts, ...(attempts >= 5 ? { lockUntil: new Date(Date.now() + 15 * 60 * 1000) } : {}) } }
      );
      throw ApiError.badRequest("Current password is incorrect.");
    }
    return user;
  }

  /**
   * Change password. With revokeAllSessions every token issued so far (access and refresh, on every device)
   * stops working and the person has to sign in again; without it only refresh sessions are ended.
   */
  async changePassword(userId, currentPassword, newPassword, { revokeAllSessions = false, actor = null } = {}) {
    const user = await this.#verifyCurrentPassword(userId, currentPassword);

    if (await comparePassword(newPassword, user.passwordHash)) {
      throw ApiError.badRequest("The new password must be different from your current password.");
    }

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          passwordHash: await hashPassword(newPassword),
          refreshTokenHash: null, // end existing refresh sessions
          passwordChangedAt: new Date(),
          mustChangePassword: false,
          failedLoginAttempts: 0,
          lockUntil: null,
        },
        ...(revokeAllSessions ? { $inc: { tokenVersion: 1 } } : {}),
      }
    );

    if (actor) {
      await logAudit({
        actorId: actor._id,
        actorName: actor.name,
        actorRole: actor.roles?.[0]?.name || "Staff",
        action: "auth.password_change",
        module: "Administration",
        targetId: String(user._id),
        details: "Changed their own password; all sessions were signed out.",
      });
    }

    return { message: "Password updated successfully." };
  }

  /**
   * Change the sign-in email of the signed-in account. Needs the current password; ends every session.
   * (There is no email verification in this system: the address is trusted once the password is confirmed.)
   */
  async changeEmail(userId, { newEmail, currentPassword }, { actor = null } = {}) {
    const user = await this.#verifyCurrentPassword(userId, currentPassword);

    const email = String(newEmail || "").trim().toLowerCase();
    if (email === user.email) {
      throw ApiError.badRequest("The new email address is the same as the current one.");
    }
    // Same answer whoever owns it, so this cannot be used to find out which addresses have accounts
    const unavailable = () => ApiError.conflict("This email address cannot be used. Please choose a different one.");
    if (await User.exists({ email, _id: { $ne: user._id } })) throw unavailable();

    try {
      await User.updateOne(
        { _id: user._id },
        {
          $set: { email, refreshTokenHash: null, failedLoginAttempts: 0, lockUntil: null },
          $inc: { tokenVersion: 1 },
        }
      );
    } catch (err) {
      if (err.code === 11000) throw unavailable(); // someone took it between the check and the save
      throw err;
    }

    if (actor) {
      await logAudit({
        actorId: actor._id,
        actorName: actor.name,
        actorRole: actor.roles?.[0]?.name || "Staff",
        action: "auth.email_change",
        module: "Administration",
        targetId: String(user._id),
        details: `Changed their sign-in email from ${user.email} to ${email}; all sessions were signed out.`,
      });
    }

    return { message: "Email address updated. Please sign in again with your new email." };
  }

  /**
   * The signed-in admin's own details: safe fields only
   */
  async getAdminProfile(userId) {
    const user = await User.findById(userId).populate("roles");
    if (!user) throw ApiError.notFound("User not found");
    return {
      id: String(user._id),
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      phoneCountryCode: user.phoneCountryCode || "",
      phoneNumber: user.phoneNumber || "",
      roles: (user.roles || []).map((r) => r.name),
      status: user.status,
      lastLoginAt: user.lastLoginAt || null,
      passwordChangedAt: user.passwordChangedAt || null,
      mustChangePassword: Boolean(user.mustChangePassword),
      isOwner: Boolean(user.isOwner),
      createdAt: user.createdAt,
    };
  }

  /**
   * Add a shipping/billing address
   */
  async addAddress(userId, addressData) {
    const user = await User.findById(userId);
    if (!user) throw ApiError.notFound("User not found");

    if (addressData.isDefault || user.addresses.length === 0) {
      user.addresses.forEach((a) => (a.isDefault = false));
      addressData.isDefault = true;
    }

    user.addresses.push(addressData);
    await user.save();

    return user.addresses[user.addresses.length - 1];
  }

  /**
   * Update address
   */
  async updateAddress(userId, addressId, addressData) {
    const user = await User.findById(userId);
    if (!user) throw ApiError.notFound("User not found");

    const addr = user.addresses.id(addressId);
    if (!addr) throw ApiError.notFound("Address not found");

    if (addressData.isDefault) {
      user.addresses.forEach((a) => (a.isDefault = false));
    }

    Object.assign(addr, addressData);
    await user.save();

    return addr;
  }

  /**
   * Delete address
   */
  async deleteAddress(userId, addressId) {
    const user = await User.findById(userId);
    if (!user) throw ApiError.notFound("User not found");

    user.addresses.pull({ _id: addressId });
    if (user.addresses.length > 0 && !user.addresses.some((a) => a.isDefault)) {
      user.addresses[0].isDefault = true;
    }
    await user.save();

    return { success: true };
  }

  /**
   * Set default address
   */
  async setDefaultAddress(userId, addressId) {
    const user = await User.findById(userId);
    if (!user) throw ApiError.notFound("User not found");

    const addr = user.addresses.id(addressId);
    if (!addr) throw ApiError.notFound("Address not found");

    user.addresses.forEach((a) => (a.isDefault = a._id.toString() === addressId));
    await user.save();

    return user.addresses;
  }
}

export const authService = new AuthService();

