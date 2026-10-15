import React from "react";

export const Badge = ({ children, variant = "default", className = "" }) => {
  const variants = {
    default: "bg-[#173D2A] text-white",
    secondary: "bg-[#386B40] text-white",
    light: "bg-[#A9D18E]/25 text-[#0B2416] border border-[#A9D18E]/50",
    discount: "bg-emerald-600 text-white font-semibold",
    warning: "bg-amber-100 text-amber-800 border border-amber-200",
    outline: "border border-[#E5E7DF] text-[#666B64]",
    earthy: "bg-[#B99A67] text-white",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider ${variants[variant] || variants.default} ${className}`}
    >
      {children}
    </span>
  );
};

