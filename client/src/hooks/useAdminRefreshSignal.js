import { useEffect, useState } from "react";
import { ADMIN_REFRESH_EVENT } from "../config/adminRefresh";

// Increments each time the admin header Refresh button finishes. Add it to an effect's dependencies
// to reload data the page keeps outside AdminContext.
export const useAdminRefreshSignal = () => {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const onRefresh = () => setTick((n) => n + 1);
    window.addEventListener(ADMIN_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(ADMIN_REFRESH_EVENT, onRefresh);
  }, []);
  return tick;
};
