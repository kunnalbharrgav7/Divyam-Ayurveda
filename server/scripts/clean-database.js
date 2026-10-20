import mongoose from "mongoose";
import { config } from "../src/config/index.js";
import { logger } from "../src/config/logger.js";
import { User } from "../src/models/User.js";
import { Role } from "../src/models/Role.js";
import { ROLES } from "../src/constants/roles.js";

const TARGET_ADMIN_EMAIL = "admin@divyamayurveda.demo";

export const cleanDatabase = async (options = {}) => {
  const isConfirmed = options.confirm || process.env.CONFIRM_CLEANUP === "true" || process.argv.includes("--confirm");

  if (!isConfirmed) {
    throw new Error(
      "Safety guard: Database cleanup requires explicit confirmation. Pass '--confirm' or set CONFIRM_CLEANUP=true."
    );
  }

  if (config.NODE_ENV === "production" && !process.env.FORCE_PRODUCTION_CLEANUP) {
    throw new Error(
      "Safety guard: Cannot clean a production database without FORCE_PRODUCTION_CLEANUP=true."
    );
  }

  const isAtlas = (config.MONGODB_URI || "").includes("mongodb+srv") || (config.MONGODB_URI || "").includes(".mongodb.net");
  if (isAtlas && process.env.ALLOW_ATLAS_CLEANUP !== "true") {
    throw new Error(
      "Safety guard: Connected database appears to be MongoDB Atlas. Wiping or cleaning an Atlas database requires explicit ALLOW_ATLAS_CLEANUP=true."
    );
  }

  logger.info({ uri: config.MONGODB_URI, env: config.NODE_ENV }, "Connecting to MongoDB for database cleanup...");
  await mongoose.connect(config.MONGODB_URI);
  const db = mongoose.connection.db;

  // 1. Audit and verify the single admin to preserve
  const adminUser = await User.findOne({ email: TARGET_ADMIN_EMAIL }).populate("roles");
  if (!adminUser) {
    throw new Error(`Target administrator account '${TARGET_ADMIN_EMAIL}' was not found in the database. Aborting.`);
  }

  const superAdminRole = await Role.findOne({ name: ROLES.SUPER_ADMIN });
  if (!superAdminRole) {
    throw new Error(`Super Admin role '${ROLES.SUPER_ADMIN}' was not found. Aborting.`);
  }

  // Ensure administrator has Super Admin role assigned and active status
  adminUser.isStaff = true;
  adminUser.status = "active";
  if (!adminUser.roles.some((r) => r.name === ROLES.SUPER_ADMIN || r._id?.toString() === superAdminRole._id.toString())) {
    adminUser.roles = [superAdminRole._id];
  }
  await adminUser.save();

  logger.info(
    { adminId: adminUser._id.toString(), email: adminUser.email, role: ROLES.SUPER_ADMIN },
    "Verified and preserved authorized administrator account"
  );

  // 2. Identify collections and record counts before cleanup
  const collections = await db.listCollections().toArray();
  const report = [];

  // Business collections to be purged completely
  const businessCollectionsToPurge = [
    "products",
    "productvariants",
    "inventorymovements",
    "categories",
    "brands",
    "collections",
    "orders",
    "payments",
    "shipments",
    "coupons",
    "ingredients",
    "testimonials",
    "faqs",
    "blogposts",
    "reviews",
    "carts",
    "quotes",
    "refunds",
    "referrals",
    "subscribers",
    "supporttickets",
    "contactenquiries",
    "returnrequests",
    "idempotencykeys",
    "webhookevents",
    "auditlogs",
  ];

  // System collections to preserve
  const systemCollectionsToPreserve = [
    "storesettings",
    "homepageconfigs",
    "referralprograms",
  ];

  for (const colInfo of collections) {
    const colName = colInfo.name;
    const col = db.collection(colName);
    const beforeCount = await col.countDocuments();
    let deletedCount = 0;
    let afterCount = beforeCount;
    let strategy = "";

    if (colName === "users") {
      // Delete all users EXCEPT the preserved administrator
      const deleteResult = await col.deleteMany({ _id: { $ne: adminUser._id } });
      deletedCount = deleteResult.deletedCount;
      afterCount = await col.countDocuments();
      strategy = "Preserved 1 Super Admin; deleted all customers & test accounts";
    } else if (colName === "roles") {
      // Preserve only the Super Admin role
      const deleteResult = await col.deleteMany({ name: { $ne: ROLES.SUPER_ADMIN } });
      deletedCount = deleteResult.deletedCount;
      afterCount = await col.countDocuments();
      strategy = "Preserved 1 Super Admin role; removed all other roles";
    } else if (businessCollectionsToPurge.includes(colName)) {
      const deleteResult = await col.deleteMany({});
      deletedCount = deleteResult.deletedCount;
      afterCount = await col.countDocuments();
      strategy = "Purged all business demo records";
    } else if (systemCollectionsToPreserve.includes(colName)) {
      deletedCount = 0;
      afterCount = beforeCount;
      strategy = "Preserved system configuration";
    } else {
      // Any other collection
      const deleteResult = await col.deleteMany({});
      deletedCount = deleteResult.deletedCount;
      afterCount = await col.countDocuments();
      strategy = "Purged unclassified collection";
    }

    report.push({
      collection: colName,
      before: beforeCount,
      deleted: deletedCount,
      after: afterCount,
      reason: strategy,
    });
  }

  logger.info({ report }, "Database cleanup completed successfully.");
  console.table(report);

  await mongoose.disconnect();
  return { adminUser, report };
};

if (process.argv[1] === import.meta.filename || process.argv.includes("--confirm")) {
  cleanDatabase({ confirm: true })
    .then(() => {
      console.log("SUCCESS: Database reset to 1 Admin and 0 business records.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("FATAL: Cleanup failed:", err.message);
      process.exit(1);
    });
}

