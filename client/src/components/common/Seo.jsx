import { useEffect } from "react";
import { BRAND, DEFAULT_DESCRIPTION, DEFAULT_IMAGE, SITE_URL, absoluteUrl } from "../../config/seoPages";

const upsertMeta = (attr, key, content) => {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

const upsertCanonical = (href) => {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
};

const absoluteImage = (image) => absoluteUrl(image) || DEFAULT_IMAGE;

const plain = (text) => String(text || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

export const applySeo = ({ title, description, path, image, type = "website", noindex = false }) => {
  const desc = plain(description).slice(0, 160) || DEFAULT_DESCRIPTION;
  const cleanPath = (path === undefined ? window.location.pathname : path).replace(/\/+$/, "");
  const url = `${SITE_URL}${cleanPath || "/"}`;
  const img = absoluteImage(image);

  if (title) document.title = title;
  upsertMeta("name", "description", desc);
  upsertMeta("name", "robots", noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");
  upsertCanonical(url);

  upsertMeta("property", "og:type", type === "article" ? "article" : "website");
  upsertMeta("property", "og:site_name", BRAND);
  if (title) upsertMeta("property", "og:title", title);
  upsertMeta("property", "og:description", desc);
  upsertMeta("property", "og:url", url);
  upsertMeta("property", "og:image", img);
  if (title) upsertMeta("name", "twitter:title", title);
  upsertMeta("name", "twitter:description", desc);
  upsertMeta("name", "twitter:image", img);
};

export const Seo = (props) => {
  const { title, description, path, image, type, noindex } = props;
  useEffect(() => {
    applySeo({ title, description, path, image, type, noindex });
  }, [title, description, path, image, type, noindex]);
  return null;
};
