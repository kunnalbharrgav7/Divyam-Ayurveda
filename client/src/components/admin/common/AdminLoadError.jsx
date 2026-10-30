import React from "react";
import { WifiOff, RefreshCw } from "lucide-react";

/** Shown when an admin resource couldn't be loaded and there is nothing cached to show instead. */
export const AdminLoadError = ({ what = "this data", onRetry, className = "" }) => (
  <div
    role="alert"
    className={`flex flex-col items-center justify-center gap-3 text-center p-8 bg-white rounded-2xl border border-rose-200 ${className}`}
  >
    <WifiOff className="w-7 h-7 text-rose-500" />
    <div>
      <p className="text-sm font-semibold text-stone-900">We couldn't load {what}</p>
      <p className="text-xs text-stone-500 mt-1">The server didn't respond. Check your connection and try again.</p>
    </div>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#173D2A] hover:bg-[#0B2416] text-white text-xs font-semibold rounded-xl transition-colors"
      >
        <RefreshCw className="w-3.5 h-3.5" /> Try again
      </button>
    )}
  </div>
);
