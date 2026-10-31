// Post-build step: writes one HTML file per public route with that route's real <title>, description,
// canonical, Open Graph / Twitter tags and (for products) Product JSON-LD already in the <head>.
// Crawlers and link-preview scrapers that don't run JavaScript then see correct metadata. The React app
// still mounts normally and takes over; the body is unchanged.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const templatePath = join(dist, "index.html");

if (!existsSync(templatePath)) {
  console.error("[prerender-meta] dist/index.html not found. Run `vite build` first.");
  process.exit(1);
}

process.env.NODE_ENV = "production";
const vite = await createServer({ root, mode: "production", logLevel: "silent", server: { middlewareMode: true }, appType: "custom" });

try {
  const seo = await vite.ssrLoadModule("/src/config/seoPages.js");
  const sd = await vite.ssrLoadModule("/src/utils/structuredData.js");
  const { STATIC_SEO, SITE_URL, DEFAULT_IMAGE, withBrand, absoluteUrl, API_BASE_URL } = { ...seo, API_BASE_URL: (await vite.ssrLoadModule("/src/config/api.js")).API_BASE_URL };
  const template = readFileSync(templatePath, "utf8");

  const esc = (v) => String(v).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const plain = (t) => String(t || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

  // dist/index.html is minified by Vite, so attribute quotes may be absent; match both forms.
  const metaPattern = (attr, key) => String.raw`<meta\s+${attr}=["']?${key}["']?\s+content=(?:"[^"]*"|'[^']*'|[^\s>]+)\s*/?>`;
  const setMeta = (html, attr, key, value) =>
    html.replace(new RegExp(metaPattern(attr, key)), `<meta ${attr}="${key}" content="${esc(value)}" />`);
  const dropMeta = (html, attr, key) => html.replace(new RegExp(String.raw`\s*` + metaPattern(attr, key)), "");

  const render = ({ title, description, path, image, type = "website", jsonLd }) => {
    const desc = plain(description).slice(0, 160) || seo.DEFAULT_DESCRIPTION;
    const url = `${SITE_URL}${path}`;
    const img = absoluteUrl(image) || DEFAULT_IMAGE;
    let html = template.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);
    html = html.replace(/<link\s+rel=["']?canonical["']?\s+href=(?:"[^"]*"|'[^']*'|[^\s>]+)\s*\/?>/, `<link rel="canonical" href="${esc(url)}" />`);
    html = setMeta(html, "name", "description", desc);
    html = setMeta(html, "property", "og:type", type);
    html = setMeta(html, "property", "og:title", title);
    html = setMeta(html, "property", "og:description", desc);
    html = setMeta(html, "property", "og:url", url);
    html = setMeta(html, "property", "og:image", img);
    html = setMeta(html, "name", "twitter:title", title);
    html = setMeta(html, "name", "twitter:description", desc);
    html = setMeta(html, "name", "twitter:image", img);
    if (img === DEFAULT_IMAGE) {
      html = setMeta(html, "property", "og:image:alt", title);
      html = setMeta(html, "name", "twitter:image:alt", title);
    } else {
      // The logo's size/type no longer describe the image.
      for (const k of ["og:image:width", "og:image:height", "og:image:type"]) html = dropMeta(html, "property", k);
      html = setMeta(html, "property", "og:image:alt", title);
      html = setMeta(html, "name", "twitter:image:alt", title);
    }
    if (jsonLd) {
      const json = JSON.stringify(jsonLd).replace(/</g, "\u003c");
      html = html.replace("</head>", `    <script type="application/ld+json" data-prerendered="${esc(jsonLd["@type"])}">${json}</script>\n  </head>`);
    }
    return html;
  };

  const write = (path, html) => {
    const dir = join(dist, ...path.split("/").filter(Boolean));
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "index.html"), html);
  };

  let count = 0;

  // Static pages ("/" is already correct in index.html)
  for (const [path, meta] of Object.entries(STATIC_SEO)) {
    if (path === "/") continue;
    write(path, render({ title: meta.title, description: meta.description, path }));
    count++;
  }

  // Dynamic pages from the live API. A cold or unreachable API must not fail the build.
  const apiBase = API_BASE_URL || process.env.PRERENDER_API_URL || "";
  const getJson = async (path) => {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(`${apiBase}${path}`, { signal: AbortSignal.timeout(60000) });
        if (res.ok) return await res.json();
      } catch {
        /* retry */
      }
    }
    return null;
  };

  if (!apiBase) {
    console.warn("[prerender-meta] No API URL (set VITE_API_URL or PRERENDER_API_URL); skipping product/category/blog pages.");
  } else {
    const products = [];
    for (let page = 1; page <= 50; page++) {
      const list = await getJson(`/api/v1/products?page=${page}&limit=100`);
      if (!list?.data) {
        if (page === 1) console.warn("[prerender-meta] Could not reach the API; skipping product pages.");
        break;
      }
      products.push(...list.data);
      if (!list.meta?.hasMore) break;
    }
    for (const item of products) {
      const detail = (await getJson(`/api/v1/products/${encodeURIComponent(item.slug)}`))?.data || item;
      const withImages = { ...detail, images: (detail.images || []).map(absoluteUrl).filter(Boolean) };
      write(`/products/${detail.slug}`, render({
        title: detail.seo?.metaTitle?.trim() || withBrand(detail.name),
        description: detail.seo?.metaDescription?.trim() || detail.shortDescription || detail.description,
        path: `/products/${detail.slug}`,
        image: detail.images?.[0],
        jsonLd: sd.buildProductSchema(withImages),
      }));
      count++;
    }

    const categories = (await getJson("/api/v1/categories"))?.data || [];
    for (const c of categories) {
      if (!c.slug) continue;
      write(`/category/${c.slug}`, render({
        title: c.seo?.metaTitle?.trim() || withBrand(c.name),
        description: c.seo?.metaDescription?.trim() || c.description,
        path: `/category/${c.slug}`,
        image: c.bannerImage || c.image,
      }));
      count++;
    }

    const posts = (await getJson("/api/v1/blog"))?.data || [];
    for (const p of posts) {
      if (!p.slug) continue;
      write(`/blog/${p.slug}`, render({
        title: p.seo?.metaTitle?.trim() || withBrand(p.title),
        description: p.seo?.metaDescription?.trim() || p.excerpt,
        path: `/blog/${p.slug}`,
        image: p.image,
        type: "article",
      }));
      count++;
    }
  }

  console.log(`[prerender-meta] wrote ${count} route files into dist/`);
} finally {
  await vite.close();
}
