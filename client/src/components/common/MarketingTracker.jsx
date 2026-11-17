import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "../../utils/metaPixel";

// Reports storefront page views to the Meta Pixel on client-side navigation (never the admin panel)
export const MarketingTracker = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    trackPageView(pathname); // skips the admin panel and private tracking links itself
  }, [pathname]);
  return null;
};
