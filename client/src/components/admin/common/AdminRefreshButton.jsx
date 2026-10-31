import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { useAdmin } from "../../../context/AdminContext";
import { refreshKeysForPath } from "../../../config/adminRefresh";

/** Re-fetches whatever the current admin page shows. Disabled while a refresh is running. */
export const AdminRefreshButton = () => {
  const { refreshAdminData } = useAdmin();
  const { pathname } = useLocation();
  const [busy, setBusy] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleRefresh = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await refreshAdminData(refreshKeysForPath(pathname));
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleRefresh}
      disabled={busy}
      aria-label="Refresh this page's data"
      title="Refresh data"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-600 text-xs font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <RefreshCw className={`w-3.5 h-3.5 ${busy ? "motion-safe:animate-spin" : ""}`} />
      <span className="hidden md:inline">{busy ? "Refreshing" : "Refresh"}</span>
    </button>
  );
};
