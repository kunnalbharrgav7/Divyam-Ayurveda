import React from "react";

/**
 * React Bits — ShinyText
 * A restrained, luxurious metallic gold or emerald shimmer sweep across typography.
 */
export const ShinyText = ({
  text,
  disabled = false,
  speed = 4,
  className = "",
  shimmerColor = "rgba(212, 175, 55, 0.9)", // Classic Ayurvedic Gold
  baseColor = "#171A17",
}) => {
  if (disabled) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span
      className={`inline-block relative overflow-hidden bg-clip-text text-transparent ${className}`}
      style={{
        backgroundImage: `linear-gradient(120deg, ${baseColor} 0%, ${baseColor} 40%, ${shimmerColor} 50%, ${baseColor} 60%, ${baseColor} 100%)`,
        backgroundSize: "200% 100%",
        animation: `shine ${speed}s linear infinite`,
      }}
    >
      {text}
    </span>
  );
};

export default ShinyText;

