/**
 * Creates the storefront policy pages (privacy, terms, shipping, returns) in the database from the
 * built-in defaults, without touching any page that already exists. The API also does this on first
 * request, so running it is optional.
 *
 *   node scripts/seed-content-pages.js              -> policy pages only
 *   node scripts/seed-content-pages.js --with-faqs  -> also adds the starter FAQs, but only when the
 *                                                       FAQ collection is completely empty
 */
import { connectDB, disconnectDB } from "../src/db/connection.js";
import { logger } from "../src/config/logger.js";
import { contentService } from "../src/services/content.service.js";
import { Faq } from "../src/models/Faq.js";
import { ContentPage } from "../src/models/ContentPage.js";
import { POLICY_SLUGS } from "../src/constants/contentPageDefaults.js";
import { faqs as starterFaqs, faqCategories } from "../../client/src/data/faqs.js";

const run = async () => {
  try {
    await connectDB();

    const before = await ContentPage.countDocuments({ slug: { $in: POLICY_SLUGS } });
    await contentService.ensurePolicyPages();
    const after = await ContentPage.countDocuments({ slug: { $in: POLICY_SLUGS } });
    logger.info(`Policy pages: ${after - before} created, ${before} already existed.`);

    if (process.argv.includes("--with-faqs")) {
      if ((await Faq.estimatedDocumentCount()) > 0) {
        logger.info("FAQs already exist; leaving them untouched.");
      } else {
        const labels = Object.fromEntries(faqCategories.map((c) => [c.id, c.label]));
        await Faq.insertMany(
          starterFaqs.map((f, index) => ({
            question: f.question,
            answer: f.answer,
            category: labels[f.category] || f.category || "General",
            displayOrder: index + 1,
            isActive: true,
          }))
        );
        logger.info(`Added ${starterFaqs.length} starter FAQs.`);
      }
    }

    await disconnectDB();
    process.exit(0);
  } catch (err) {
    logger.fatal({ err: err.message }, "Content page seeding failed");
    process.exit(1);
  }
};

run();
