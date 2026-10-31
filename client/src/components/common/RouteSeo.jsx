import { useLocation } from "react-router-dom";
import { Seo } from "./Seo";
import { STATIC_SEO, isDynamicSeoPath, isNoindexPath, withBrand } from "../../config/seoPages";

// Sets head tags for static routes. Detail pages (product, category, blog post) render their own <Seo />.
export const RouteSeo = () => {
  const { pathname } = useLocation();
  if (isDynamicSeoPath(pathname)) return null;

  const path = pathname.replace(/(?<=.)\/+$/, "");
  if (isNoindexPath(path)) return <Seo title={withBrand()} path={path} noindex />;

  const meta = STATIC_SEO[path];
  // Unknown routes (404 page) must not be indexed under a made-up URL.
  if (!meta) return <Seo title={withBrand("Page Not Found")} path={path} noindex />;
  return <Seo title={meta.title} description={meta.description} path={path} />;
};
