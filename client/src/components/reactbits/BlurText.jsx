import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";

/**
 * React Bits — BlurText
 * Restrained typography reveal with soft blur-to-sharp transition and staggered word sequence.
 */
export const BlurText = ({
  text = "",
  delay = 50,
  className = "",
  animateBy = "words", // 'words' or 'letters'
  threshold = 0.1,
  rootMargin = "-50px",
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: threshold, margin: rootMargin });

  const elements = animateBy === "words" ? text.split(" ") : text.split("");

  return (
    <span ref={ref} className={`inline-flex flex-wrap gap-x-1.5 ${className}`}>
      {elements.map((item, index) => (
        <motion.span
          key={index}
          initial={{ filter: "blur(8px)", opacity: 0, y: 12 }}
          animate={
            isInView
              ? { filter: "blur(0px)", opacity: 1, y: 0 }
              : { filter: "blur(8px)", opacity: 0, y: 12 }
          }
          transition={{
            duration: 0.5,
            delay: (index * delay) / 1000,
            ease: [0.25, 0.1, 0.25, 1],
          }}
          className="inline-block"
        >
          {item}
        </motion.span>
      ))}
    </span>
  );
};

export default BlurText;

