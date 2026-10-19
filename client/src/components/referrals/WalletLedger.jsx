import React, { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useReferrals } from "../../context/ReferralContext";
import { formatINR, formatDate } from "../../utils/formatters";

const SOURCE_LABEL = {
  referral_reward: "Referral reward",
  referral_clawback: "Referral reward reversed",
  refund_credit: "Refund to store credit",
  checkout_spend: "Used at checkout",
  checkout_restore: "Credit returned",
  admin_adjustment: "Adjustment",
};

// Store-credit history (referral rewards, refunds, spending). Reloads whenever the referral dashboard refreshes.
export const WalletLedger = () => {
  const { authFetch } = useAuth();
  const { dashboardData } = useReferrals();
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let cancelled = false;
    authFetch("/api/v1/referrals/wallet")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => !cancelled && json?.success && setRows(json.data.transactions))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [dashboardData]);

  return (
    <div className="bg-white rounded-3xl border border-[#E5E7DF] p-6 sm:p-8 shadow-xs space-y-4">
      <h4 className="font-heading tracking-tight text-lg font-bold text-[#171A17] flex items-center gap-2">
        <Wallet size={18} className="text-[#386B40]" />
        <span>Store Credit History</span>
      </h4>
      {rows.length === 0 ? (
        <p className="text-xs text-stone-500">No store credit activity yet.</p>
      ) : (
        <div className="divide-y divide-stone-100">
          {rows.map((t) => (
            <div key={t.id} className="py-3 flex items-center justify-between gap-3 text-xs">
              <div className="min-w-0">
                <span className="font-semibold text-stone-900 block">{SOURCE_LABEL[t.source] || t.source}</span>
                <span className="text-[10px] text-stone-400">
                  {formatDate(t.createdAt)}
                  {t.reference ? ` • ${t.reference}` : ""}
                </span>
              </div>
              <div className="text-right">
                <span className={`font-bold ${t.type === "credit" ? "text-emerald-700" : "text-rose-700"}`}>
                  {t.type === "credit" ? "+" : "-"}
                  {formatINR(t.amount)}
                </span>
                <span className="text-[10px] text-stone-400 block">Balance {formatINR(t.balanceAfter)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
