import { connectDB, disconnectDB } from "../src/db/connection.js";
import { User } from "../src/models/User.js";
import { logger } from "../src/config/logger.js";
import { parseLegacyPhone } from "../src/utils/phone.js";

/**
 * One-off: converts every account's free-text phone ("+91 98765 43210", "9876543210") into the canonical fields
 * used for mobile sign-in: phone (+919876543210), phoneCountryCode (+91) and phoneNumber (9876543210).
 *
 *   node scripts/migrate-user-phones.js           -> dry run: lists what would change, writes nothing
 *   node scripts/migrate-user-phones.js --apply   -> makes the change
 *
 * - Numbers starting with "+" are read as international; anything else is assumed to be Indian (+91).
 * - Accounts whose number cannot be read, or that would collide with another account, are LISTED and left untouched
 *   so you can fix them by hand. Nothing else about an account is changed.
 * - Safe to run again: accounts that already have the canonical fields are skipped.
 */
const apply = process.argv.includes("--apply");

const run = async () => {
  await connectDB();

  const users = await User.find({ phone: { $exists: true, $nin: [null, ""] } }).select("email phone phoneCountryCode phoneNumber");
  const claimed = new Map(); // canonical number -> email that will own it
  const plans = [];
  const problems = [];
  let alreadyDone = 0;

  for (const user of users) {
    const parsed = parseLegacyPhone(user.phone);
    if (!parsed) {
      problems.push({ email: user.email, phone: user.phone, reason: "not a valid number" });
      continue;
    }
    if (user.phone === parsed.phone && user.phoneCountryCode === parsed.phoneCountryCode && user.phoneNumber === parsed.phoneNumber) {
      alreadyDone += 1;
      claimed.set(parsed.phone, user.email);
      continue;
    }
    const owner = claimed.get(parsed.phone);
    if (owner && owner !== user.email) {
      problems.push({ email: user.email, phone: user.phone, reason: `same number as ${owner} (${parsed.phone})` });
      continue;
    }
    claimed.set(parsed.phone, user.email);
    plans.push({ user, parsed });
  }

  for (const { user, parsed } of plans) {
    logger.info(`${user.email}: "${user.phone}" -> ${parsed.phone} (${parsed.phoneCountryCode} ${parsed.phoneNumber})`);
    if (apply) {
      await User.updateOne(
        { _id: user._id },
        { $set: { phone: parsed.phone, phoneCountryCode: parsed.phoneCountryCode, phoneNumber: parsed.phoneNumber } }
      );
    }
  }

  for (const p of problems) logger.warn(`NEEDS REVIEW ${p.email}: "${p.phone}" - ${p.reason}`);

  logger.info(
    `${apply ? "Updated" : "Would update"} ${plans.length} account(s); ${alreadyDone} already canonical; ${problems.length} need review.`
  );
  if (!apply) logger.info("Dry run only. Re-run with --apply to save.");
  await disconnectDB();
};

run().catch(async (err) => {
  logger.error(err);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
