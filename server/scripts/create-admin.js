import { connectDB, disconnectDB } from "../src/db/connection.js";
import { User } from "../src/models/User.js";
import { Role } from "../src/models/Role.js";
import { ROLES, DEFAULT_ROLE_PERMISSIONS } from "../src/constants/roles.js";
import { hashPassword } from "../src/utils/crypto.js";
import { logger } from "../src/config/logger.js";

/**
 * Creates the first Super Admin. Safe by default:
 *  - refuses to run in production unless ALLOW_PRODUCTION_ADMIN_CREATE=true, and then needs ADMIN_EMAIL and a
 *    strong ADMIN_PASSWORD from the environment (no built-in default credentials are ever used there);
 *  - never creates a second Super Admin (the admin may have changed their email, so "same email" is not a test);
 *  - marks the admin it creates as the store owner (see set-owner.js for an account that already exists);
 *  - never overwrites the password of an existing account, unless --reset-password is passed outside production.
 * It is not part of build or start, and no deployment step should run it.
 */
const isProduction = process.env.NODE_ENV === "production";
const resetPassword = process.argv.includes("--reset-password");

const DEV_EMAIL = "admin@divyamayurveda.demo";
const DEV_PASSWORD = "DivyamAdmin!2026";

const fail = (message) => {
  logger.fatal(message);
  process.exit(1);
};

const createAdmin = async () => {
  if (isProduction && process.env.ALLOW_PRODUCTION_ADMIN_CREATE !== "true") {
    fail(
      "create-admin is disabled in production. To provision the first admin deliberately, set ALLOW_PRODUCTION_ADMIN_CREATE=true together with ADMIN_EMAIL and ADMIN_PASSWORD for this one run."
    );
  }
  if (isProduction && resetPassword) {
    fail("--reset-password is not available in production. Change the password from Admin > Profile & Security instead.");
  }

  const email = (process.env.ADMIN_EMAIL || (isProduction ? "" : DEV_EMAIL)).trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || (isProduction ? "" : DEV_PASSWORD);

  if (!email) fail("ADMIN_EMAIL is required.");
  if (isProduction && (password.length < 12 || !/[A-Za-z]/.test(password) || !/\d/.test(password))) {
    fail("ADMIN_PASSWORD must be at least 12 characters and contain letters and numbers.");
  }

  try {
    await connectDB();

    // 1. Ensure Roles exist (Super Admin only)
    await Role.deleteMany({ name: { $ne: ROLES.SUPER_ADMIN } });
    for (const [roleName, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      await Role.findOneAndUpdate(
        { name: roleName },
        { name: roleName, permissions, isSystem: true },
        { upsert: true, new: true }
      );
    }
    const superAdminRole = await Role.findOne({ name: ROLES.SUPER_ADMIN });

    // 2. Do not create a second Super Admin
    const existingSuperAdmins = await User.find({ isStaff: true, roles: superAdminRole._id }).select("email");
    const sameEmail = await User.findOne({ email }).select("+passwordHash");

    if (sameEmail) {
      if (!resetPassword) {
        logger.info("An account with this email already exists; nothing was changed. (Use --reset-password in development to reset its password.)");
        await disconnectDB();
        process.exit(0);
      }
      sameEmail.passwordHash = await hashPassword(password);
      sameEmail.tokenVersion = (sameEmail.tokenVersion || 0) + 1; // signs out everything issued before
      sameEmail.refreshTokenHash = null;
      sameEmail.failedLoginAttempts = 0;
      sameEmail.lockUntil = null;
      await sameEmail.save();
      logger.info({ email }, "Password reset for the existing account.");
      await disconnectDB();
      process.exit(0);
    }

    if (existingSuperAdmins.length > 0) {
      logger.info(
        { superAdmins: existingSuperAdmins.length },
        "A Super Admin already exists, so no second one was created. Sign in with that account, or use --reset-password with its ADMIN_EMAIL in development."
      );
      await disconnectDB();
      process.exit(0);
    }

    // 3. Create the first Super Admin
    const admin = await User.create({
      name: "Divyam Store Administrator",
      email,
      phone: "+919876500001",
      passwordHash: await hashPassword(password),
      isStaff: true,
      isOwner: true,
      roles: [superAdminRole._id],
      status: "active",
    });

    logger.info({ email: admin.email, role: ROLES.SUPER_ADMIN }, "Super Admin created and marked as the store owner.");
    await disconnectDB();
    process.exit(0);
  } catch (err) {
    logger.fatal({ err: err.message }, "Failed to create admin user");
    process.exit(1);
  }
};

createAdmin();
