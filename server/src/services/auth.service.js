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

export class AuthService {
  /**
   * Register a new customer
   */
  async register({ name, email, phone, password, referralCode: invitedByCode = null }) {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      throw ApiError.conflict("An account with this email address already exists.");
    }

    if (phone) {
      const existingPhone = await User.findOne({ phone });
      if (existingPhone) {
        throw ApiError.conflict("An account with this mobile phone number already exists.");
      }
    }

    const passwordHash = await hashPassword(password);
    const referralCode = await generateReferralCode(name);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      phone: phone || undefined,
      passwordHash,
      referralCode,
      isStaff: false,
      status: "active",
      addresses: [],
    });

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
  async login({ email, password, isStaffRequired = false }) {
    const user = await User.findOne({ email: email.toLowerCase() })
      .select("+passwordHash +refreshTokenHash")
      .populate("roles");

    if (!user) {
      throw ApiError.unauthorized("Invalid email address or password.");
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
      throw ApiError.unauthorized("Invalid email address or password.");
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
    if (data.phone) user.phone = data.phone.trim();
    if (data.avatarUrl) user.avatarUrl = data.avatarUrl;

    try {
      await user.save();
    } catch (err) {
      if (err.code === 11000) throw ApiError.conflict("This phone number is already used by another account.");
      throw err;
    }
    return user.toJSON();
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

