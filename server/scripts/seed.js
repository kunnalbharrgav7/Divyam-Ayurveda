import { connectDB, disconnectDB } from "../src/db/connection.js";
import { logger } from "../src/config/logger.js";
import { toPaise } from "../src/utils/currency.js";
import { hashPassword } from "../src/utils/crypto.js";

import { Role } from "../src/models/Role.js";
import { User } from "../src/models/User.js";
import { Category } from "../src/models/Category.js";
import { Brand } from "../src/models/Brand.js";
import { Collection } from "../src/models/Collection.js";
import { Ingredient } from "../src/models/Ingredient.js";
import { Product } from "../src/models/Product.js";
import { ProductVariant } from "../src/models/ProductVariant.js";
import { InventoryMovement } from "../src/models/InventoryMovement.js";
import { Coupon } from "../src/models/Coupon.js";
import { Faq } from "../src/models/Faq.js";
import { Testimonial } from "../src/models/Testimonial.js";
import { BlogPost } from "../src/models/BlogPost.js";
import { StoreSettings } from "../src/models/StoreSettings.js";
import { HomepageConfig } from "../src/models/HomepageConfig.js";
import { ReferralProgram } from "../src/models/ReferralProgram.js";
import { Order } from "../src/models/Order.js";

import { ROLES, DEFAULT_ROLE_PERMISSIONS } from "../src/constants/roles.js";
import { INVENTORY_REASONS } from "../src/constants/inventoryReasons.js";

// Import client seed datasets
import { categories as seedCategories } from "../../client/src/data/categories.js";
import { products as seedProducts } from "../../client/src/data/products.js";
import { collections as seedCollections } from "../../client/src/data/collections.js";
import { initialBrands } from "../../client/src/data/brands.js";
import { initialCoupons } from "../../client/src/data/coupons.js";
import { ingredients as seedIngredients } from "../../client/src/data/ingredients.js";
import { faqs as seedFaqs } from "../../client/src/data/faqs.js";
import { testimonials as seedTestimonials } from "../../client/src/data/testimonials.js";
import { blogPosts as seedBlogPosts } from "../../client/src/data/blogPosts.js";
import { initialHomepageContent, initialStoreSettings } from "../../client/src/data/storeSettings.js";

const runSeed = async () => {
  if (process.env.ALLOW_DEMO_SEED !== "true" && !process.argv.includes("--force")) {
    logger.warn("Seeding is disabled to protect clean database state. Run with ALLOW_DEMO_SEED=true or --force if you deliberately want to re-populate demo records.");
    process.exit(0);
  }

  try {
    logger.info("Connecting to MongoDB database for seeding...");
    await connectDB();

    // 1. Roles & Permissions Matrix
    logger.info("Seeding roles and permission matrix (Super Admin only)...");
    await Role.deleteMany({ name: { $ne: ROLES.SUPER_ADMIN } });
    const roleDocs = {};
    for (const [roleName, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      const role = await Role.findOneAndUpdate(
        { name: roleName },
        { name: roleName, permissions, isSystem: true },
        { upsert: true, new: true }
      );
      roleDocs[roleName] = role;
    }

    // 2. Default Super Admin & Test Customer
    logger.info("Seeding administrative and customer user accounts...");
    const adminPasswordHash = await hashPassword("DivyamAdmin!2026");
    const customerPasswordHash = await hashPassword("StrongPass!123");

    await User.findOneAndUpdate(
      { email: "admin@divyamayurveda.demo" },
      {
        name: "Divyam Store Administrator",
        email: "admin@divyamayurveda.demo",
        phone: "+919876500001",
        passwordHash: adminPasswordHash,
        isStaff: true,
        roles: [roleDocs[ROLES.SUPER_ADMIN]._id],
        status: "active",
      },
      { upsert: true }
    );

    const testCustomer = await User.findOneAndUpdate(
      { email: "aarav.sharma@example.com" },
      {
        name: "Aarav Sharma",
        email: "aarav.sharma@example.com",
        phone: "9876543210",
        passwordHash: customerPasswordHash,
        isStaff: false,
        status: "active",
        referralCode: "DIVYAMAAR1001",
        addresses: [
          {
            fullName: "Aarav Sharma",
            phone: "9876543210",
            street: "Flat 402, Nilgiri Heights, 12th Main Road, Indiranagar",
            city: "Bengaluru",
            state: "Karnataka",
            pincode: "560038",
            type: "Home",
            isDefault: true,
          },
        ],
      },
      { upsert: true, new: true }
    );

    // 3. Categories
    logger.info(`Seeding ${seedCategories.length} categories...`);
    for (const cat of seedCategories) {
      await Category.findOneAndUpdate(
        { slug: cat.slug },
        {
          name: cat.name,
          slug: cat.slug,
          shortName: cat.name,
          description: cat.description || "",
          image: cat.image || "",
          bannerImage: cat.bannerImage || "",
          subcategories: (cat.subcategories || []).map((s) => ({
            id: s.id,
            name: s.name,
            slug: s.slug,
            description: s.description || "",
            image: s.image || "",
          })),
          isFeatured: true,
          status: "active",
        },
        { upsert: true }
      );
    }

    // 4. Brands
    logger.info("Seeding brands...");
    for (const b of initialBrands) {
      await Brand.findOneAndUpdate(
        { slug: b.slug },
        { name: b.name, slug: b.slug, description: b.description || "", logo: b.logo || "", status: "active" },
        { upsert: true }
      );
    }

    // 5. Collections
    logger.info("Seeding collections...");
    for (const col of seedCollections) {
      await Collection.findOneAndUpdate(
        { slug: col.slug },
        {
          name: col.name,
          slug: col.slug,
          description: col.description || "",
          image: col.image || "",
          filterTag: col.filterTag || "",
          isFeatured: true,
          status: "active",
        },
        { upsert: true }
      );
    }

    // 6. Ingredients
    logger.info("Seeding botanical ingredients...");
    for (const ing of seedIngredients) {
      const slug = ing.slug || ing.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      await Ingredient.findOneAndUpdate(
        { slug },
        {
          name: ing.name,
          sanskritName: ing.sanskritName || "",
          botanicalName: ing.botanicalName || "",
          slug,
          description: ing.traditionalUses || ing.description || "",
          benefits: Array.isArray(ing.benefits) ? ing.benefits : (ing.traditionalUses ? [ing.traditionalUses] : []),
          doshaEffect: ing.doshaBalance || ing.doshaEffect || "",
          doshaBalance: ing.doshaBalance || ing.doshaEffect || "",
          partUsed: ing.partUsed || "",
          traditionalUses: ing.traditionalUses || ing.description || "",
          featuredInProducts: ing.featuredInProducts || [],
          image: ing.image || "",
          status: "active",
        },
        { upsert: true }
      );
    }

    // 7. Products and Product Variants with Integer Paise
    logger.info(`Seeding ${seedProducts.length} catalog products with variants in integer paise...`);
    await Product.deleteMany({});
    await ProductVariant.deleteMany({});
    for (const p of seedProducts) {
      const basePricePaise = toPaise(Number(p.price));
      const compareAtPricePaise = toPaise(Number(p.originalPrice || 0));

      const product = await Product.findOneAndUpdate(
        { slug: p.slug },
        {
          name: p.name,
          slug: p.slug,
          sku: p.sku || `DIV-${(p.id || p.slug).toUpperCase().replace(/[^A-Z0-9]/g, "-")}`,
          brand: p.brand || "Divyam Ayurveda",
          categoryId: p.categoryId,
          subcategoryId: p.subcategoryId || "",
          subcategory: p.subcategory || "",
          shortDescription: p.shortDescription || "",
          description: p.description || "",
          images: p.images || [],
          packSize: p.packSize || "Standard Pack",
          productForm: p.productForm || "Powder / Churna",
          ingredients: p.ingredients || [],
          basePricePaise,
          compareAtPricePaise,
          tags: p.tags || [],
          dosha: p.dosha || ["Vata", "Pitta"],
          warnings: p.warnings || "",
          productInformation: p.productInformation || {},
          rating: Number(p.rating || 4.9),
          reviewCount: Number(p.reviewCount || 24),
          isFeatured: Boolean(p.isFeatured),
          isBestSeller: Boolean(p.isBestSeller),
          isTrending: Boolean(p.isTrending),
          isNew: Boolean(p.isNew),
          status: "active",
        },
        { upsert: true, new: true }
      );

      // Create variants
      const rawVariants = Array.isArray(p.variants) && p.variants.length > 0
        ? p.variants
        : [{ size: p.packSize || "Standard", price: p.price, originalPrice: p.originalPrice }];

      for (const v of rawVariants) {
        const vPricePaise = toPaise(Number(v.price));
        const vComparePaise = toPaise(Number(v.originalPrice || 0));
        const vLabel = v.size || v.label || "Standard";
        const vSku = `${product.sku}-${vLabel.replace(/[^a-zA-Z0-9]/g, "")}`.toUpperCase();

        const stockOnHand = p.stockQuantity || 50;
        const variant = await ProductVariant.findOneAndUpdate(
          { sku: vSku },
          {
            productId: product._id,
            sku: vSku,
            label: vLabel,
            pricePaise: vPricePaise,
            compareAtPricePaise: vComparePaise,
            stockOnHand,
            reservedStock: 0,
            reorderThreshold: 10,
            weightGrams: 250,
            isActive: true,
          },
          { upsert: true, new: true }
        );

        // Record initial inventory receipt movement
        await InventoryMovement.findOneAndUpdate(
          { variantId: variant._id, reason: INVENTORY_REASONS.WAREHOUSE_ADJUSTMENT },
          {
            variantId: variant._id,
            productId: product._id,
            delta: stockOnHand,
            beforeStock: 0,
            afterStock: stockOnHand,
            reason: INVENTORY_REASONS.WAREHOUSE_ADJUSTMENT,
            reference: "Initial Seed Stock Receipt",
            actorId: "seed_script",
            note: "Initial warehouse stocking",
          },
          { upsert: true }
        );
      }
    }

    // 8. Coupons
    logger.info("Seeding promotional coupons...");
    for (const c of initialCoupons) {
      await Coupon.findOneAndUpdate(
        { code: c.code.toUpperCase() },
        {
          code: c.code.toUpperCase(),
          description: c.description || "",
          type: c.discountType === "fixed" ? "fixed_amount" : "percentage",
          value: c.discountType === "fixed" ? toPaise(Number(c.discountValue)) : Number(c.discountValue),
          minimumOrderPaise: toPaise(Number(c.minOrderValue || 0)),
          maximumDiscountPaise: toPaise(Number(c.maxDiscountValue || 0)),
          isActive: true,
        },
        { upsert: true }
      );
    }

    // Add WELCOME10 coupon for tests
    await Coupon.findOneAndUpdate(
      { code: "WELCOME10" },
      {
        code: "WELCOME10",
        description: "10% off on your welcome order",
        type: "percentage",
        value: 10,
        minimumOrderPaise: 0,
        maximumDiscountPaise: 50000, // ₹500 cap
        isActive: true,
      },
      { upsert: true }
    );

    // 9. Faqs & Testimonials & Blog
    logger.info("Seeding FAQs, testimonials and educational blog posts...");
    for (const f of seedFaqs) {
      await Faq.findOneAndUpdate({ question: f.question }, { ...f, isActive: true }, { upsert: true });
    }
    for (const t of seedTestimonials) {
      await Testimonial.findOneAndUpdate({ name: t.name }, { ...t, isActive: true }, { upsert: true });
    }
    for (const b of seedBlogPosts) {
      await BlogPost.findOneAndUpdate(
        { slug: b.slug },
        { ...b, status: "published", publishedAt: new Date(b.date || Date.now()) },
        { upsert: true }
      );
    }

    // 10. StoreSettings & HomepageConfig & ReferralProgram
    logger.info("Seeding StoreSettings, HomepageConfig and ReferralProgram...");
    await StoreSettings.findOneAndUpdate(
      {},
      { ...initialStoreSettings },
      { upsert: true }
    );
    await HomepageConfig.findOneAndUpdate(
      {},
      { ...initialHomepageContent },
      { upsert: true }
    );
    await ReferralProgram.findOneAndUpdate(
      {},
      {
        enabled: true,
        programName: "Divyam Wellness Seeker Circle",
        referrerRewardType: "fixed_credit",
        referrerRewardPaise: 20000, // ₹200
        refereeDiscountType: "percentage",
        refereeDiscountPercent: 10,
        minOrderValuePaise: 99900, // ₹999
        cookieExpiryDays: 30,
        qualifyingState: "delivered",
      },
      { upsert: true }
    );

    // 11. Initial Sample Seed Order for Testing
    logger.info("Seeding initial verified order for customer...");
    const sampleVariant = await ProductVariant.findOne({ isActive: true });
    if (sampleVariant) {
      const sampleProduct = await Product.findById(sampleVariant.productId);
      await Order.findOneAndUpdate(
        { orderNumber: "DA-20261017-000123" },
        {
          orderNumber: "DA-20261017-000123",
          userId: testCustomer._id,
          customer: {
            name: "Aarav Sharma",
            email: "aarav.sharma@example.com",
            phone: "9876543210",
          },
          shippingAddress: {
            fullName: "Aarav Sharma",
            phone: "9876543210",
            street: "42 MG Road, Indiranagar",
            city: "Bengaluru",
            state: "Karnataka",
            pincode: "560038",
          },
          items: [
            {
              variantId: sampleVariant._id,
              productId: sampleProduct._id,
              sku: sampleVariant.sku,
              name: sampleProduct.name,
              size: sampleVariant.label,
              unitPricePaise: sampleVariant.pricePaise,
              quantity: 2,
              lineTotalPaise: sampleVariant.pricePaise * 2,
              weightGrams: 250,
            },
          ],
          pricing: {
            subtotalPaise: sampleVariant.pricePaise * 2,
            couponDiscountPaise: 0,
            referralDiscountPaise: 0,
            shippingPaise: 0,
            taxPaise: Math.round(sampleVariant.pricePaise * 2 * 0.12),
            cgstPaise: Math.round((sampleVariant.pricePaise * 2 * 0.12) / 2),
            sgstPaise: Math.round((sampleVariant.pricePaise * 2 * 0.12) / 2),
            igstPaise: 0,
            taxType: "intra_state",
            totalPaise: sampleVariant.pricePaise * 2,
          },
          status: "delivered",
          paymentStatus: "succeeded",
          fulfilmentStatus: "fulfilled",
          paymentMethod: "Online Payment",
          deliveryMethod: "standard",
          timeline: [
            { status: "Order Placed", time: new Date(Date.now() - 3 * 86400000), completed: true },
            { status: "Dispatched", time: new Date(Date.now() - 2 * 86400000), completed: true },
            { status: "Delivered", time: new Date(Date.now() - 86400000), completed: true },
          ],
        },
        { upsert: true }
      );
    }

    logger.info("Seed process completed successfully! All data ported to MongoDB.");
    await disconnectDB();
    process.exit(0);
  } catch (err) {
    logger.fatal({ err: err.message, stack: err.stack }, "Seed script failed");
    process.exit(1);
  }
};

runSeed();
