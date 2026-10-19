import { connectDB, disconnectDB } from "../src/db/connection.js";
import { User } from "../src/models/User.js";
import { Role } from "../src/models/Role.js";
import { ROLES, DEFAULT_ROLE_PERMISSIONS } from "../src/constants/roles.js";
import { hashPassword } from "../src/utils/crypto.js";
import { logger } from "../src/config/logger.js";

const createAdmin = async () => {
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

    // 2. Create or update default Super Admin
    const email = process.env.ADMIN_EMAIL || "admin@divyamayurveda.demo";
    const password = process.env.ADMIN_PASSWORD || "DivyamAdmin!2026";
    const passwordHash = await hashPassword(password);

    const admin = await User.findOneAndUpdate(
      { email },
      {
        name: "Divyam Store Administrator",
        email,
        phone: "+919876500001",
        passwordHash,
        isStaff: true,
        roles: [superAdminRole._id],
        status: "active",
      },
      { upsert: true, new: true }
    );

    logger.info(
      { email: admin.email, role: ROLES.SUPER_ADMIN },
      "Admin user created / updated successfully!"
    );

    await disconnectDB();
    process.exit(0);
  } catch (err) {
    logger.fatal({ err: err.message }, "Failed to create admin user");
    process.exit(1);
  }
};

createAdmin();

