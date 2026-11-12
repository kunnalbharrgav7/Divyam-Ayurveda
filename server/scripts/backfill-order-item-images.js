import { connectDB, disconnectDB } from "../src/db/connection.js";
import { Order } from "../src/models/Order.js";
import { Product } from "../src/models/Product.js";
import { toPublicImages } from "../src/utils/productImages.js";
import { logger } from "../src/config/logger.js";

/**
 * One-off: repairs order lines whose saved product photo is empty or points at a product that no
 * longer exists, by copying the photo from a matching live product (same product id, else same SKU or name).
 *
 *   node scripts/backfill-order-item-images.js           -> dry run: lists what would change, writes nothing
 *   node scripts/backfill-order-item-images.js --apply   -> makes the change
 *
 * Lines with no matching product are left alone (the storefront shows a placeholder tile for them).
 */
const apply = process.argv.includes("--apply");
const IMAGE_ENDPOINT = /\/api\/v1\/products\/([a-f0-9]{24})\/images\//i;

const run = async () => {
  await connectDB();
  const products = await Product.find({}).select("name sku images updatedAt").lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));
  const bySku = new Map(products.filter((p) => p.sku).map((p) => [p.sku.toUpperCase(), p]));
  const byName = new Map(products.map((p) => [p.name.trim().toLowerCase(), p]));
  const firstImage = (p) => toPublicImages(p)[0] || "";

  let changed = 0;
  let unresolved = 0;
  const orders = await Order.find({}).select("orderNumber items");
  for (const order of orders) {
    let dirty = false;
    for (const item of order.items) {
      const match = String(item.image || "").match(IMAGE_ENDPOINT);
      const dead = !item.image || (match && !byId.has(match[1]));
      if (!dead) continue;
      const source =
        byId.get(String(item.productId)) ||
        (item.sku && bySku.get(String(item.sku).toUpperCase())) ||
        byName.get(String(item.name || "").trim().toLowerCase());
      const image = source ? firstImage(source) : "";
      if (!image) {
        unresolved += 1;
        logger.warn(`${order.orderNumber}: no photo found for "${item.name}"`);
        continue;
      }
      logger.info(`${order.orderNumber}: "${item.name}" -> ${image.slice(0, 80)}`);
      item.image = image;
      dirty = true;
      changed += 1;
    }
    if (dirty && apply) await order.save();
  }

  logger.info(`${apply ? "Updated" : "Would update"} ${changed} order line(s); ${unresolved} could not be matched.`);
  if (!apply) logger.info("Dry run only. Re-run with --apply to save.");
  await disconnectDB();
};

run().catch(async (err) => {
  logger.error(err);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
