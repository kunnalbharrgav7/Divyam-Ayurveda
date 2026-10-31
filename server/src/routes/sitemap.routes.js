import { Router } from "express";
import { Product } from "../models/Product.js";
import { Category } from "../models/Category.js";
import { BlogPost } from "../models/BlogPost.js";

const router = Router();

const SITE_URL = (process.env.SITE_URL || "https://divyamayurveda.in").replace(/\/+$/, "");

// Public, indexable static routes (mirrors the client's STATIC_SEO map).
const STATIC_PATHS = [
  "/", "/products", "/about", "/our-story", "/ayurveda", "/ingredients", "/blog",
  "/reviews", "/faq", "/contact", "/offers", "/shipping", "/returns", "/privacy", "/terms", "/referrals",
];

const escapeXml = (value) =>
  String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

const urlEntry = (path, lastmod) =>
  `  <url>\n    <loc>${escapeXml(SITE_URL + path)}</loc>${lastmod ? `\n    <lastmod>${new Date(lastmod).toISOString()}</lastmod>` : ""}\n  </url>`;

router.get("/sitemap.xml", async (req, res, next) => {
  try {
    const [products, categories, posts] = await Promise.all([
      Product.find({ status: "active" }).select("slug updatedAt").lean(),
      Category.find({ status: "active" }).select("slug updatedAt").lean(),
      BlogPost.find({ status: "published" }).select("slug updatedAt").lean(),
    ]);

    const entries = [
      ...STATIC_PATHS.map((p) => urlEntry(p)),
      ...categories.filter((c) => c.slug).map((c) => urlEntry(`/category/${encodeURIComponent(c.slug)}`, c.updatedAt)),
      ...products.filter((p) => p.slug).map((p) => urlEntry(`/products/${encodeURIComponent(p.slug)}`, p.updatedAt)),
      ...posts.filter((b) => b.slug).map((b) => urlEntry(`/blog/${encodeURIComponent(b.slug)}`, b.updatedAt)),
    ];

    res
      .type("application/xml")
      .set("Cache-Control", "public, max-age=3600")
      .send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`);
  } catch (err) {
    next(err);
  }
});

export default router;
