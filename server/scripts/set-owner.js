import { connectDB, disconnectDB } from "../src/db/connection.js";
import { User } from "../src/models/User.js";
import { logger } from "../src/config/logger.js";

/**
 * Marks an EXISTING staff account as the store owner (one-off, for databases created before owners existed).
 *
 *   node scripts/set-owner.js owner@example.com            -> dry run: shows what would change, writes nothing
 *   node scripts/set-owner.js owner@example.com --apply    -> makes the change
 *
 * Refuses when an owner already exists, when the email is not an active staff account, and never touches anyone else.
 */
const email = String(process.argv[2] || "").trim().toLowerCase();
const apply = process.argv.includes("--apply");

const done = async (code, message, extra = {}) => {
  if (code === 0) logger.info(extra, message);
  else logger.error(extra, message);
  await disconnectDB().catch(() => {});
  process.exit(code);
};

const run = async () => {
  if (!email || email.startsWith("--")) {
    logger.error("Usage: node scripts/set-owner.js <email> [--apply]");
    process.exit(1);
  }

  await connectDB();

  const existing = await User.find({ isStaff: true, isOwner: true }).select("email");
  if (existing.length > 0) {
    return done(1, "An owner already exists; nothing was changed.", { owner: existing.map((u) => u.email) });
  }

  const target = await User.findOne({ email });
  if (!target || !target.isStaff) return done(1, "No staff account has this email address.", { email });
  if (target.status !== "active") return done(1, "That staff account is not active.", { email, status: target.status });

  const staffCount = await User.countDocuments({ isStaff: true });
  logger.info({ email, name: target.name, staffAccounts: staffCount }, apply ? "Marking this account as the store owner." : "Dry run: this account would be marked as the store owner.");

  if (!apply) {
    return done(0, "Nothing was written. Run again with --apply to make the change.", { email });
  }

  await User.updateOne({ _id: target._id }, { $set: { isOwner: true } });
  return done(0, "Done. This account is now the store owner and the only one who can manage the admin team.", { email });
};

run().catch((err) => done(1, "set-owner failed", { err: err.message }));
