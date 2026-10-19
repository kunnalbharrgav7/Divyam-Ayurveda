import React, { useEffect, useRef } from "react";

/**
 * useScrollReveal
 * High-performance, zero-dependency scroll reveal hook using IntersectionObserver.
 * Unobserves immediately upon entering viewport to prevent continuous layout/paint recalculations.
 * Automatically respects `prefers-reduced-motion`.
 */
export const useScrollReveal = (options = {}) => {
  const ref = useRef(null);
  const { threshold = 0.12, rootMargin = "0px 0px -30px 0px" } = options;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Reduced motion check: immediately show without animation
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      element.classList.add("is-revealed");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin]);

  return ref;
};

/**
 * ScrollReveal wrapper component
 * Applies restrained, elegant editorial fade-up entrances with optional stagger delay.
 */
export const ScrollReveal = ({
  children,
  className = "",
  delay = 0,
  yOffset = 18,
  duration = 600,
}) => {
  const elementRef = useRef(null);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.opacity = "1";
      el.style.transform = "none";
      return;
    }

    // Set initial state
    el.style.opacity = "0";
    el.style.transform = `translateY(${yOffset}px)`;
    el.style.transition = `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            el.style.opacity = "1";
            el.style.transform = "translateY(0)";
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -30px 0px" }
    );

    observer.observe(el);

    return () => observer.disconnect();
  }, [delay, yOffset, duration]);

  return (
    <div ref={elementRef} className={className}>
      {children}
    </div>
  );
};

