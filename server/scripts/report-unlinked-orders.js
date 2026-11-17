import { connectDB, disconnectDB } from "../src/db/connection.js";
import { Order } from "../src/models/Order.js";
import { User } from "../src/models/User.js";
import { logger } from "../src/config/logger.js";

/**
 * Read-only report, run once before deploying guest checkout.
 *
 * Until now an account also saw orders that merely carried the same email address. That rule is gone (emails are
 * not verified, so it let anyone who registered with someone else's email read their orders). Orders are now
 * visible in "My Orders" only when they are linked to the account (userId), e.g. by a guest's one-time claim link.
 *
 * This lists orders that have NO account link but whose email matches a registered customer, i.e. orders that
 * customer could see before and will not see after the change. It changes nothing.
 *
 *   node scripts/report-unlinked-orders.js
 *
 * If any appear, decide case by case (e.g. issue the customer a private tracking link from the admin order page).
 */
const run = async () => {
  await connectDB();

  const unlinked = await Order.find({ userId: null }).select("orderNumber customer.email createdAt status").lean();
  const emails = [...new Set(unlinked.map((o) => String(o.customer?.email || "").toLowerCase()).filter(Boolean))];
  const users = await User.find({ email: { $in: emails }, isStaff: { $ne: true } }).select("email").lean();
  const registered = new Set(users.map((u) => u.email.toLowerCase()));
  const affected = unlinked.filter((o) => registered.has(String(o.customer?.email || "").toLowerCase()));

  logger.info(
    { ordersWithoutAccount: unlinked.length, matchingARegisteredEmail: affected.length },
    "Orders without an account link"
  );
  for (const o of affected) {
    logger.info({ orderNumber: o.orderNumber, email: o.customer.email, placed: o.createdAt, status: o.status }, "Was visible by email match");
  }
  if (affected.length === 0) logger.info("Nothing to review: every order a customer could see is linked to their account.");

  await disconnectDB();
};

run().catch(async (err) => {
  logger.error({ err: err.message }, "Report failed");
  await disconnectDB().catch(() => {});
  process.exit(1);
});
