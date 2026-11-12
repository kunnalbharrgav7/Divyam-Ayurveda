import { connectDB, disconnectDB } from "../src/db/connection.js";
import { Product } from "../src/models/Product.js";
import { ProductVariant } from "../src/models/ProductVariant.js";
import { logger } from "../src/config/logger.js";
import { PRODUCT_TYPES } from "../src/constants/productTypes.js";

/**
 * One-off: gives products saved before product types existed a type, a selling mode and structured pack sizes.
 *
 *   node scripts/backfill-product-types.js           -> dry run: lists what would change, writes nothing
 *   node scripts/backfill-product-types.js --apply   -> makes the change
 *
 * Only fills fields that are still unset (productType "other", pack quantity empty). Never touches price, stock or names.
 */
const apply = process.argv.includes("--apply");

const guessType = (text) => {
  const t = String(text || "").toLowerCase();
  if (/tablet|\btab\b|vati|gutika/.test(t)) return "tablet";
  if (/capsule|\bcap\b/.test(t)) return "capsule";
  if (/oil|thailam|tailam/.test(t)) return "oil";
  if (/syrup|liquid|juice|asava|arishta|drops/.test(t)) return "liquid";
  if (/gel|cream|balm|ointment|lotion/.test(t)) return "gel_cream";
  if (/resin|shilajit|paste|avaleha|jam|honey|ghee|prash/.test(t)) return "resin";
  if (/powder|churna|granule|leaves|decoction|\bg\b/.test(t)) return "powder";
  return "other";
};

// "60 Tablets" -> { quantity: 60, unit: "Tablets" }; "250g" -> { 250, "g" }
const parsePack = (label) => {
  const m = String(label || "").trim().match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)$/);
  return m ? { quantity: Number(m[1]), unit: m[2].toLowerCase() === "tablets" ? "Tablets" : m[2] } : null;
};

const done = async (code, message, extra = {}) => {
  if (code === 0) logger.info(extra, message);
  else logger.error(extra, message);
  await disconnectDB().catch(() => {});
  process.exit(code);
};

const run = async () => {
  await connectDB();
  const products = await Product.find({});
  let typed = 0;
  let packs = 0;

  for (const product of products) {
    const variants = await ProductVariant.find({ productId: product._id, isActive: true }).sort({ createdAt: 1 });
    const changes = {};

    if (product.productType === "other") {
      const type = guessType(`${product.productForm} ${product.name} ${product.packSize}`);
      if (type !== "other") changes.productType = type;
    }
    const soldAs = variants.length === 1 ? "single" : "multiple";
    if (product.soldAs !== soldAs && variants.length > 0) changes.soldAs = soldAs;

    if (Object.keys(changes).length) {
      typed += 1;
      logger.info({ product: product.name, ...changes }, apply ? "Updating product" : "Would update product");
      if (apply) await Product.updateOne({ _id: product._id }, { $set: changes });
    }

    for (const variant of variants) {
      if (variant.packQuantity) continue;
      const parsed = parsePack(variant.label);
      if (!parsed) continue;
      packs += 1;
      if (apply) await ProductVariant.updateOne({ _id: variant._id }, { $set: { packQuantity: parsed.quantity, packUnit: parsed.unit } });
    }
  }

  const known = Object.keys(PRODUCT_TYPES).length;
  return done(0, apply ? "Done." : "Dry run: nothing was written. Run again with --apply to make the change.", {
    products: products.length,
    productsChanged: typed,
    packSizesParsed: packs,
    knownTypes: known,
  });
};

run().catch((err) => done(1, "backfill-product-types failed", { err: err.message }));
