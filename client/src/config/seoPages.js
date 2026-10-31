import { API_BASE_URL } from "./api";

export const BRAND = "Divyam Ayurveda";
export const SITE_URL = (import.meta.env.VITE_SITE_URL || "https://divyamayurveda.in").replace(/\/+$/, "");
export const DEFAULT_IMAGE = `${SITE_URL}/images/Logo/Logo1.png`;
export const DEFAULT_DESCRIPTION =
  "Shop authentic Ayurvedic herbal products from Divyam Ayurveda: Shilajit, Ashwagandha, herbal wellness supplements and natural skincare, delivered across India.";

export const withBrand = (name) => (name ? `${name} | ${BRAND}` : `${BRAND} | Ayurvedic Herbal Products & Wellness`);

// Metadata for static routes. Dynamic detail routes (products/:slug, category/:slug, blog/:slug)
// set their own tags through <Seo /> and are intentionally absent here.
export const STATIC_SEO = {
  "/": {
    title: `${BRAND} | Ayurvedic Herbal Products & Wellness`,
    description: DEFAULT_DESCRIPTION,
  },
  "/products": {
    title: withBrand("Shop Ayurvedic Herbal Products"),
    description: "Browse Shilajit, Ashwagandha, herbal supplements and natural skincare from Divyam Ayurveda.",
  },
  "/about": { title: withBrand("About Us"), description: "Learn about Divyam Ayurveda and our approach to herbal wellness rooted in classical Ayurveda." },
  "/our-story": { title: withBrand("Our Story"), description: "The story behind Divyam Ayurveda and our commitment to traditional botanical formulations." },
  "/ayurveda": { title: withBrand("Learn About Ayurveda"), description: "An introduction to Ayurveda, its principles and how it informs herbal wellness." },
  "/ingredients": { title: withBrand("Ayurvedic Ingredients"), description: "Explore the herbs and botanicals used in Divyam Ayurveda formulations." },
  "/blog": { title: withBrand("Ayurveda & Wellness Blog"), description: "Articles on Ayurveda, herbs and everyday wellness from Divyam Ayurveda." },
  "/reviews": { title: withBrand("Customer Reviews"), description: "Read what customers say about Divyam Ayurveda products." },
  "/faq": { title: withBrand("Frequently Asked Questions"), description: "Answers about orders, shipping, returns and using Divyam Ayurveda products." },
  "/contact": { title: withBrand("Contact Us"), description: "Get in touch with the Divyam Ayurveda team for questions about products and orders." },
  "/offers": { title: withBrand("Offers & Deals"), description: "Current offers and deals on Divyam Ayurveda herbal products." },
  "/shipping": { title: withBrand("Shipping Information"), description: "Shipping times, charges and delivery details for Divyam Ayurveda orders in India." },
  "/returns": { title: withBrand("Returns & Refunds"), description: "Return and refund policy for Divyam Ayurveda orders." },
  "/privacy": { title: withBrand("Privacy Policy"), description: "How Divyam Ayurveda collects, uses and protects your personal information." },
  "/terms": { title: withBrand("Terms & Conditions"), description: "Terms and conditions for using the Divyam Ayurveda website and placing orders." },
  "/referrals": { title: withBrand("Referral Program"), description: "Refer friends to Divyam Ayurveda and earn rewards." },
};

// Private, transactional or utility routes that should stay out of search results.
const NOINDEX_PREFIXES = ["/admin", "/cart", "/checkout", "/account", "/login", "/register", "/forgot-password", "/order-confirmation", "/track-order", "/wishlist"];

export const isNoindexPath = (pathname) => NOINDEX_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
export const isDynamicSeoPath = (pathname) => /^\/(products|product|category|blog)\/[^/]+/.test(pathname);

// Uploaded images are served by the API host as relative /api/... paths; everything else lives on the site host.
export const absoluteUrl = (url) => {
  if (!url || typeof url !== "string" || url.startsWith("data:")) return "";
  if (/^https?:\/\//i.test(url)) return url;
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${path.startsWith("/api/") && API_BASE_URL ? API_BASE_URL : SITE_URL}${path}`;
};
