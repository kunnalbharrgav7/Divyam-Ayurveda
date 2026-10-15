import React from "react";

export const AdminCard = ({
  title,
  subtitle,
  action,
  children,
  className = "",
  noPadding = false,
  headerBorder = true,
}) => {
  return (
    <div
      className={`bg-white rounded-xl border border-stone-200/90 shadow-xs transition-shadow hover:shadow-sm overflow-hidden ${className}`}
    >
      {(title || subtitle || action) && (
        <div
          className={`px-5 py-4 flex flex-wrap items-center justify-between gap-3 ${
            headerBorder ? "border-b border-stone-100" : ""
          }`}
        >
          <div>
            {title && (
              <h3 className="font-semibold text-stone-900 text-base tracking-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-stone-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}
      <div className={noPadding ? "" : "p-5"}>{children}</div>
    </div>
  );
};

export const StatCard = ({
  title,
  value,
  change,
  isPositive,
  subtitle,
  icon: Icon,
  color = "emerald",
  badgeText,
}) => {
  const colorMap = {
    emerald: {
      bg: "bg-emerald-50 text-emerald-700 border-emerald-100",
      iconBg: "bg-emerald-600 text-white",
      ring: "ring-emerald-500/20",
    },
    amber: {
      bg: "bg-amber-50 text-amber-700 border-amber-100",
      iconBg: "bg-amber-500 text-white",
      ring: "ring-amber-500/20",
    },
    blue: {
      bg: "bg-sky-50 text-sky-700 border-sky-100",
      iconBg: "bg-sky-600 text-white",
      ring: "ring-sky-500/20",
    },
    rose: {
      bg: "bg-rose-50 text-rose-700 border-rose-100",
      iconBg: "bg-rose-600 text-white",
      ring: "ring-rose-500/20",
    },
    stone: {
      bg: "bg-stone-100 text-stone-700 border-stone-200",
      iconBg: "bg-stone-800 text-white",
      ring: "ring-stone-500/20",
    },
  };

  const scheme = colorMap[color] || colorMap.emerald;

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs transition-all hover:shadow-md hover:border-stone-300">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-medium uppercase tracking-wider text-stone-500">
            {title}
          </span>
          <h4 className="text-2xl font-bold text-stone-900 mt-1 tracking-tight font-sans">
            {value}
          </h4>
        </div>
        {Icon && (
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-xs ${scheme.iconBg}`}
          >
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2 pt-2 border-t border-stone-100 text-xs">
        {change !== undefined && (
          <span
            className={`font-semibold inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded ${
              isPositive
                ? "bg-emerald-100 text-emerald-800"
                : "bg-rose-100 text-rose-800"
            }`}
          >
            {isPositive ? "↑" : "↓"} {change}
          </span>
        )}
        {badgeText && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-700">
            {badgeText}
          </span>
        )}
        <span className="text-stone-500">{subtitle || "vs last period"}</span>
      </div>
    </div>
  );
};

