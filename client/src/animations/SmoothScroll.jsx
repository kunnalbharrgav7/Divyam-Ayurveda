import React, { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export const SmoothScroll = ({ children }) => {
  const location = useLocation();
  const lenisRef = useRef(null);

  useEffect(() => {
    // Respect user's reduced-motion preference
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      return;
    }

    // Initialize smooth Lenis instance
    const lenis = new Lenis({
      duration: 1.0, // Balanced, responsive duration
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Natural deceleration
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.5,
      prevent: (node) => {
        return (
          Boolean(node?.closest?.("[data-lenis-prevent]")) ||
          Boolean(node?.closest?.("aside")) ||
          window.location.pathname.startsWith("/admin")
        );
      },
    });

    lenisRef.current = lenis;

    // If initial route is an admin page, pause Lenis immediately so native scrolling is preserved
    if (window.location.pathname.startsWith("/admin")) {
      lenis.stop();
    }

    // Synchronize Lenis scrolling with GSAP ScrollTrigger
    lenis.on("scroll", ScrollTrigger.update);

    // Bind Lenis animation frame to GSAP ticker for synchronous updates
    const tickerCallback = (time) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(tickerCallback);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tickerCallback);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // Handle route change scroll-to-top & pause/resume Lenis for admin
  useEffect(() => {
    if (lenisRef.current) {
      if (location.pathname.startsWith("/admin")) {
        lenisRef.current.stop();
      } else {
        lenisRef.current.start();
        lenisRef.current.scrollTo(0, { immediate: true });
      }
    } else {
      window.scrollTo(0, 0);
    }
  }, [location.pathname]);

  return <>{children}</>;
};

export default SmoothScroll;

