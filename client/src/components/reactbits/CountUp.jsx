import React, { useEffect, useState, useRef } from "react";

/**
 * React Bits — CountUp
 * Smoothly rolls up an integer number when revealed in viewport.
 */
export const CountUp = ({
  to,
  from = 0,
  duration = 2,
  separator = ",",
  className = "",
}) => {
  const [count, setCount] = useState(from);
  const elementRef = useRef(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const startTime = performance.now();
          const totalMs = duration * 1000;

          const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / totalMs, 1);
            // Ease out quart
            const easeProgress = 1 - Math.pow(1 - progress, 4);
            const currentVal = Math.round(from + (to - from) * easeProgress);

            setCount(currentVal);

            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };

          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [to, from, duration]);

  const formatted = count.toLocaleString("en-IN");

  return (
    <span ref={elementRef} className={className}>
      {formatted}
    </span>
  );
};

export default CountUp;

