import React from "react";
import { RANGE_OPTIONS } from "../../../hooks/useRevenueReport";

const selectCls = "px-3 py-2 text-xs rounded-xl border border-stone-300 bg-white font-medium text-stone-700";

// "Which orders count as revenue?" and "for which period?", with a plain-language explanation of the choice
export const RevenueFilters = ({ report, days, setDays, basis, setBasis }) => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
    <select value={basis} onChange={(e) => setBasis(e.target.value)} className={selectCls} aria-label="Revenue basis" title={report?.basisDescription}>
      {(report?.bases || [{ key: "collected", label: "Payment received" }]).map((b) => (
        <option key={b.key} value={b.key}>{b.label}</option>
      ))}
    </select>
    <select value={days} onChange={(e) => setDays(e.target.value)} className={selectCls} aria-label="Period">
      {RANGE_OPTIONS.map((r) => (
        <option key={r.value} value={r.value}>{r.label}</option>
      ))}
    </select>
  </div>
);
