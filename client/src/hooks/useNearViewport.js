import { useEffect, useRef, useState } from "react";

/**
 * Becomes true (and stays true) once the referenced element is within `rootMargin` of the
 * viewport. Below-the-fold sections use it to start their data fetch just before they scroll
 * into view instead of all fetching at page load.
 */
export const useNearViewport = (rootMargin = "600px 0px") => {
  const ref = useRef(null);
  // Without IntersectionObserver there is nothing to wait for, so start immediately
  const [near, setNear] = useState(() => typeof IntersectionObserver === "undefined");

  useEffect(() => {
    if (near) return undefined;
    const element = ref.current;
    if (!element) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [near, rootMargin]);

  return [ref, near];
};
