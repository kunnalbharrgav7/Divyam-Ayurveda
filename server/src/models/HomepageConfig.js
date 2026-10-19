import mongoose from "mongoose";

const homepageConfigSchema = new mongoose.Schema(
  {
    hero: {
      eyebrow: { type: String, default: "Rooted in Ayurveda. Made for Modern Living." },
      heading: { type: String, default: "Embrace Ayurveda." },
      headingItalic: { type: String, default: "Live Naturally." },
      description: {
        type: String,
        default:
          "Explore authentic Ayurvedic herbs, classical churnas, cold-pressed oils, and everyday wellness essentials inspired by India's timeless herbal heritage.",
      },
      primaryBtnText: { type: String, default: "Shop Now" },
      primaryBtnLink: { type: String, default: "/products" },
      secondaryBtnText: { type: String, default: "Explore Our Story" },
      secondaryBtnLink: { type: String, default: "/our-story" },
      image: { type: String, default: "" },
      badgeTitle: { type: String, default: "Nature Nourishes A Better You" },
      badgeSubtitle: { type: String, default: "100% Herbal" },
    },
    sectionsVisibility: {
      hero: { type: Boolean, default: true },
      trustBadges: { type: Boolean, default: true },
      shopByCategory: { type: Boolean, default: true },
      bestsellers: { type: Boolean, default: true },
      trending: { type: Boolean, default: true },
      newArrivals: { type: Boolean, default: true },
      featuredCollections: { type: Boolean, default: true },
      promotionalBanners: { type: Boolean, default: true },
      benefitsStrip: { type: Boolean, default: true },
      testimonials: { type: Boolean, default: true },
      blogHighlights: { type: Boolean, default: true },
      newsletter: { type: Boolean, default: true },
    },
    promotionalBanners: {
      bannerA: {
        tag: { type: String, default: "Pure Herbs • Natural Vitality ♥" },
        title: { type: String, default: "Nature's Wisdom for Everyday Wellness" },
        description: {
          type: String,
          default: "Clean botanical churnas, golden Lakadong haldi, and wild single-origin honey.",
        },
        btnText: { type: String, default: "Shop Ayurvedic Herbs" },
        btnLink: { type: String, default: "/products?category=ayurvedic-herbs" },
        image: { type: String, default: "" },
      },
      bannerB: {
        tag: { type: String, default: "Eco-Conscious Harvesting" },
        title: { type: String, default: "Rediscover the Art of Ayurveda" },
        description: {
          type: String,
          default: "Together for a cleaner, greener and healthier tomorrow. Zero synthetics, zero plastic waste.",
        },
        btnText: { type: String, default: "Shop Classical Remedies" },
        btnLink: { type: String, default: "/products?category=wellness-essentials" },
        image: { type: String, default: "" },
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const HomepageConfig = mongoose.model("HomepageConfig", homepageConfigSchema);

