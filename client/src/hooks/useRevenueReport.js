import { useEffect, useRef, useState } from "react";
import { useAdmin } from "../context/AdminContext";
import { storage } from "../utils/storage";

const PREF_KEY = "divyam_admin_revenue_prefs";

export const RANGE_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 12 months" },
  { value: "all", label: "All time" },
];

/**
 * Revenue figures for the admin dashboard and reports. The server decides what counts as revenue
 * (payment received, minus refunds); this hook only asks, and refreshes when orders change.
 */
export const useRevenueReport = ({ months = 6 } = {}) => {
  const { fetchRevenueReport, orders } = useAdmin();
  const fetchRef = useRef(fetchRevenueReport);
  fetchRef.current = fetchRevenueReport;

  const saved = storage.get(PREF_KEY, {});
  const [days, setDays] = useState(saved.days || "30");
  const [basis, setBasis] = useState(saved.basis || "collected");
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    storage.set(PREF_KEY, { days, basis });
  }, [days, basis]);

  // Any order, status or payment change re-runs the report
  const signature = (orders || []).map((o) => `${o.id}:${o.status}:${o.paymentStatus}`).join("|");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await fetchRef.current({ days, basis, months });
        if (!cancelled) {
          setReport(data);
          setError("");
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Could not load the revenue report.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    setLoading(true);
    load();
    const timer = setInterval(() => document.visibilityState === "visible" && load(), 60000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [days, basis, months, signature]);

  return { report, error, loading, days, setDays, basis, setBasis };
};
