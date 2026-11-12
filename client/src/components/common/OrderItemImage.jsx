import React, { useState } from "react";

/**
 * Product photo for an order line. Orders keep a copy of the photo URL, which can later be empty or
 * dead (for example the product was removed), so this falls back to a neutral tile with the
 * product's initial instead of the browser's broken-image icon.
 */
export const OrderItemImage = ({ src, name = "", size = 40, className = "" }) => {
  const [failed, setFailed] = useState(false);
  const dimension = { width: size, height: size };

  if (!src || failed) {
    return (
      <div
        style={dimension}
        className={`flex items-center justify-center shrink-0 bg-[#FBFAF6] border border-stone-200 text-[#386B40] font-semibold ${className}`}
        role="img"
        aria-label={name || "Product"}
      >
        <span style={{ fontSize: Math.max(12, size * 0.4) }}>{(name || "P").trim().charAt(0).toUpperCase()}</span>
      </div>
    );
  }

  return (
    <img
      {...dimension}
      src={src}
      alt={name}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={`object-contain bg-[#FBFAF6] border p-1 shrink-0 ${className}`}
    />
  );
};

export default OrderItemImage;
