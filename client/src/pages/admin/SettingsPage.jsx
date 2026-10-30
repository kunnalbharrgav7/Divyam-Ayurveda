import React, { useMemo, useState } from "react";
import { Save, Check, CreditCard, Truck, Bell, Building, Plus, Trash2, Info, AlertTriangle } from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import { AdminCard } from "../../components/admin/common/AdminCard";
import { INDIAN_STATES } from "../../utils/shippingCalculator";
import { DetailPageSkeleton } from "../../components/common/Skeleton";
import { AdminLoadError } from "../../components/admin/common/AdminLoadError";

const TABS = [
  { id: "general", label: "General & Brand", icon: Building },
  { id: "shipping", label: "Shipping & Tax", icon: Truck },
  { id: "payments", label: "Payment Gateways", icon: CreditCard },
  { id: "notifications", label: "Alerts & Notifications", icon: Bell },
];

const inputClass =
  "w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#173D2A] focus:border-[#173D2A]";
const labelClass = "block text-xs font-semibold text-stone-700 mb-1";
const hintClass = "text-[11px] text-stone-400 mt-1";

// The editable shape of each tab, taken from what the server has stored (nothing is invented here)
const editable = (s) => ({
  general: {
    storeName: s.general?.storeName ?? "",
    storeTagline: s.general?.storeTagline ?? "",
    contactEmail: s.general?.contactEmail ?? "",
    contactPhone: s.general?.contactPhone ?? "",
    dispensaryAddress: s.general?.dispensaryAddress ?? "",
    bannerAnnouncementText: s.appearance?.bannerAnnouncementText ?? "",
  },
  shipping: {
    originState: s.shipping?.originState ?? "",
    originCity: s.shipping?.originCity ?? "",
    originPincode: s.shipping?.originPincode ?? "",
    expressShippingFee: s.shipping?.expressShippingFee ?? 0,
    dispatchLeadTime: s.shipping?.dispatchLeadTime ?? "",
    zones: (s.shipping?.zones || []).map((z) => ({
      id: z.id,
      name: z.name ?? "",
      tier: z.tier ?? "",
      description: z.description ?? "",
      baseFee: z.baseFee ?? 0,
      freeThreshold: z.freeThreshold ?? 0,
      deliveryDays: z.deliveryDays ?? "",
      matchType: z.matchType || "states",
      states: [...(z.states || [])],
    })),
    standardGstRate: s.tax?.standardGstRate ?? 0,
    gstinNumber: s.tax?.gstinNumber ?? "",
  },
  payments: {
    enableOnlinePayments: s.store?.enableOnlinePayments !== false,
    enableCashOnDelivery: s.store?.enableCashOnDelivery !== false,
    maxCodLimit: s.store?.maxCodLimit ?? 0,
  },
  notifications: {
    emailOnNewOrder: Boolean(s.notifications?.emailOnNewOrder),
    smsOnDispatch: Boolean(s.notifications?.smsOnDispatch),
    lowStockAlerts: Boolean(s.notifications?.lowStockAlerts),
    dailySalesDigest: Boolean(s.notifications?.dailySalesDigest),
  },
});

// What to send to the API for a tab
const toPatch = (tab, d) => {
  if (tab === "general") {
    const { bannerAnnouncementText, ...general } = d;
    return { general, appearance: { bannerAnnouncementText } };
  }
  if (tab === "shipping") {
    const { standardGstRate, gstinNumber, ...shipping } = d;
    return { shipping, tax: { standardGstRate, gstinNumber } };
  }
  if (tab === "payments") return { store: d };
  return { notifications: d };
};

const Switch = ({ checked, onChange, label, description, disabled = false }) => (
  <label className={`flex items-start justify-between gap-4 p-4 rounded-xl border border-stone-200 bg-stone-50/60 ${disabled ? "opacity-60" : "cursor-pointer hover:bg-stone-50"}`}>
    <span>
      <span className="block font-semibold text-stone-900 text-sm">{label}</span>
      {description && <span className="block text-xs text-stone-500 mt-0.5">{description}</span>}
    </span>
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
      className="w-4 h-4 mt-1 shrink-0 rounded border-stone-300 text-[#173D2A] focus:ring-[#173D2A]"
    />
  </label>
);

const ZONE_TYPES = [
  { id: "origin", label: "Dispatch state only" },
  { id: "states", label: "Selected states" },
  { id: "rest", label: "All other states" },
];

const ZoneCard = ({ zone, index, zones, originState, onChange, onRemove }) => {
  const takenBy = useMemo(() => {
    const map = new Map();
    zones.forEach((z) => {
      if (z.id !== zone.id && z.matchType === "states") z.states.forEach((s) => map.set(s, z.name));
    });
    return map;
  }, [zones, zone.id]);

  const toggleState = (state) =>
    onChange({
      states: zone.states.includes(state) ? zone.states.filter((s) => s !== state) : [...zone.states, state],
    });

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-3 flex-1">
          <div>
            <label className={labelClass}>Zone name</label>
            <input className={inputClass} value={zone.name} onChange={(e) => onChange({ name: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Applies to</label>
            <select className={inputClass} value={zone.matchType} onChange={(e) => onChange({ matchType: e.target.value })}>
              {ZONE_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Delivery time</label>
            <input className={inputClass} value={zone.deliveryDays} onChange={(e) => onChange({ deliveryDays: e.target.value })} placeholder="e.g. 2–4 Business Days" />
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${zone.name || `zone ${index + 1}`}`}
          className="mt-6 p-2 rounded-lg border border-stone-200 text-stone-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>Shipping fee (₹)</label>
          <input type="number" min="0" step="1" className={inputClass} value={zone.baseFee} onChange={(e) => onChange({ baseFee: e.target.value })} />
        </div>
        <div>
          <label className={labelClass}>Free delivery from (₹)</label>
          <input type="number" min="0" step="1" className={inputClass} value={zone.freeThreshold} onChange={(e) => onChange({ freeThreshold: e.target.value })} />
        </div>
        <div>
          <label className={labelClass}>Short description</label>
          <input className={inputClass} value={zone.description} onChange={(e) => onChange({ description: e.target.value })} />
        </div>
      </div>

      {zone.matchType === "origin" && (
        <p className="text-xs text-stone-500">
          Used for orders delivered within the dispatch state{originState ? ` (${originState})` : ""}.
        </p>
      )}
      {zone.matchType === "rest" && (
        <p className="text-xs text-stone-500">Used for every state that isn't covered by another zone. Exactly one zone must be set to this.</p>
      )}
      {zone.matchType === "states" && (
        <div>
          <p className={labelClass}>
            States in this zone <span className="font-normal text-stone-400">({zone.states.length} selected)</span>
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-1.5 max-h-48 overflow-y-auto p-3 rounded-xl border border-stone-200 bg-stone-50/60">
            {INDIAN_STATES.map((state) => {
              const other = takenBy.get(state);
              return (
                <label key={state} className={`flex items-center gap-2 text-xs ${other ? "text-stone-400" : "text-stone-700 cursor-pointer"}`} title={other ? `Already in ${other}` : undefined}>
                  <input
                    type="checkbox"
                    checked={zone.states.includes(state)}
                    disabled={Boolean(other)}
                    onChange={() => toggleState(state)}
                    className="rounded border-stone-300 text-[#173D2A] focus:ring-[#173D2A]"
                  />
                  <span>{state}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const SettingsPageForm = () => {
  const { storeSettings, saveStoreSettings } = useAdmin();
  const saved = useMemo(() => editable(storeSettings), [storeSettings]);
  const [drafts, setDrafts] = useState(saved);
  const [activeTab, setActiveTab] = useState("general");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null); // { text, isError }

  const isDirty = (tab) => JSON.stringify(saved[tab]) !== JSON.stringify(drafts[tab]);
  const draft = drafts[activeTab];
  const setField = (tab, patch) => setDrafts((prev) => ({ ...prev, [tab]: { ...prev[tab], ...patch } }));

  const notify = (text, isError = false) => {
    setToast({ text, isError });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await saveStoreSettings(toPatch(activeTab, drafts[activeTab]));
      // Show exactly what the server stored
      setDrafts((prev) => ({ ...prev, [activeTab]: editable(data)[activeTab] }));
      notify("Settings saved. The storefront uses them right away.");
    } catch (err) {
      notify(err.message || "Could not save settings.", true);
    } finally {
      setSaving(false);
    }
  };

  const updateZone = (id, patch) =>
    setField("shipping", { zones: drafts.shipping.zones.map((z) => (z.id === id ? { ...z, ...patch } : z)) });
  const addZone = () =>
    setField("shipping", {
      zones: [
        ...drafts.shipping.zones,
        { id: `zone-${Date.now()}`, name: "New zone", tier: "Standard", description: "", baseFee: 0, freeThreshold: 0, deliveryDays: "", matchType: "states", states: [] },
      ],
    });
  const removeZone = (id) => setField("shipping", { zones: drafts.shipping.zones.filter((z) => z.id !== id) });

  const restCount = drafts.shipping.zones.filter((z) => z.matchType === "rest").length;

  return (
    <form onSubmit={handleSave} className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 font-sans tracking-tight">Store & Platform Settings</h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Changes are saved to the database and apply to the storefront, cart and checkout immediately.
          </p>
        </div>

        <button
          type="submit"
          disabled={!isDirty(activeTab) || saving}
          className="inline-flex items-center gap-1.5 whitespace-nowrap px-4 py-2 rounded-xl bg-[#173D2A] text-white hover:bg-[#0B2416] text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? "Saving…" : "Save Settings"}</span>
        </button>
      </div>

      {toast && (
        <div
          role="status"
          className={`p-3 border rounded-xl text-xs font-semibold flex items-center gap-2 ${
            toast.isError ? "bg-rose-50 border-rose-200 text-rose-800" : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}
        >
          {toast.isError ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          <span>{toast.text}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1 border-b border-stone-200 pb-3">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === tab.id ? "bg-[#173D2A] text-white" : "text-stone-600 hover:bg-stone-200/60"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {isDirty(tab.id) && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Unsaved changes" />}
            </button>
          );
        })}
      </div>

      {/* ---------------------------------------------------------------- General */}
      {activeTab === "general" && (
        <div className="space-y-6">
          <AdminCard title="General Store Information" subtitle="Shown on the contact page and used across the storefront">
            <div className="space-y-4 max-w-2xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Brand Store Name</label>
                  <input className={inputClass} value={draft.storeName} onChange={(e) => setField("general", { storeName: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Tagline</label>
                  <input className={inputClass} value={draft.storeTagline} onChange={(e) => setField("general", { storeTagline: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Support Email Address</label>
                  <input type="email" className={inputClass} value={draft.contactEmail} onChange={(e) => setField("general", { contactEmail: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Support Phone</label>
                  <input className={inputClass} value={draft.contactPhone} onChange={(e) => setField("general", { contactPhone: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Currency</label>
                  <input className={`${inputClass} bg-stone-50 text-stone-500`} value="INR (₹)" disabled readOnly />
                </div>
              </div>
              <div>
                <label className={labelClass}>Registered Herbal Dispensary & Headquarters</label>
                <textarea rows={2} className={inputClass} value={draft.dispensaryAddress} onChange={(e) => setField("general", { dispensaryAddress: e.target.value })} />
              </div>
            </div>
          </AdminCard>

          <AdminCard title="Announcement Bar" subtitle="The message across the top of every storefront page">
            <div className="max-w-2xl">
              <label className={labelClass}>Announcement text</label>
              <input className={inputClass} value={draft.bannerAnnouncementText} onChange={(e) => setField("general", { bannerAnnouncementText: e.target.value })} />
              <p className={hintClass}>Put a dash between a headline and the message ("HEADLINE — message") to highlight the headline.</p>
            </div>
          </AdminCard>
        </div>
      )}

      {/* ---------------------------------------------------------------- Shipping & Tax */}
      {activeTab === "shipping" && (
        <div className="space-y-6">
          <AdminCard title="Dispatch Warehouse & Fulfillment Origin" subtitle="Where orders ship from. The dispatch state decides the local zone and whether GST is CGST+SGST or IGST">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Origin State</label>
                <select className={inputClass} value={draft.originState} onChange={(e) => setField("shipping", { originState: e.target.value })}>
                  {INDIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Origin City</label>
                <input className={inputClass} value={draft.originCity} onChange={(e) => setField("shipping", { originCity: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Origin Dispatch PIN Code</label>
                <input inputMode="numeric" maxLength={6} className={`${inputClass} font-mono`} value={draft.originPincode} onChange={(e) => setField("shipping", { originPincode: e.target.value.replace(/\D/g, "") })} />
              </div>
              <div>
                <label className={labelClass}>Express delivery fee (₹)</label>
                <input type="number" min="0" step="1" className={inputClass} value={draft.expressShippingFee} onChange={(e) => setField("shipping", { expressShippingFee: e.target.value })} />
                <p className={hintClass}>Added on top of the zone fee for express orders.</p>
              </div>
              <div>
                <label className={labelClass}>Dispatch lead time</label>
                <input className={inputClass} value={draft.dispatchLeadTime} onChange={(e) => setField("shipping", { dispatchLeadTime: e.target.value })} placeholder="e.g. 24-48 Hours" />
              </div>
            </div>
          </AdminCard>

          <AdminCard
            title="Shipping Zones & Rates"
            subtitle="Each order's delivery fee comes from the zone of its delivery state"
            action={
              <button
                type="button"
                onClick={addZone}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#173D2A] hover:underline"
              >
                <Plus className="w-3.5 h-3.5" /> Add zone
              </button>
            }
          >
            <div className="space-y-4">
              {restCount !== 1 && (
                <p className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
                  Exactly one zone must be set to "All other states", so every address has a delivery rate. You currently have {restCount}.
                </p>
              )}
              {drafts.shipping.zones.map((zone, index) => (
                <ZoneCard
                  key={zone.id}
                  zone={zone}
                  index={index}
                  zones={drafts.shipping.zones}
                  originState={drafts.shipping.originState}
                  onChange={(patch) => updateZone(zone.id, patch)}
                  onRemove={() => removeZone(zone.id)}
                />
              ))}
            </div>
          </AdminCard>

          <AdminCard title="GST (Tax) Configuration" subtitle="Product prices include GST; the tax shown on invoices is worked out from them">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <div>
                <label className={labelClass}>Standard GST rate (%)</label>
                <input type="number" min="0" max="40" step="0.5" className={inputClass} value={draft.standardGstRate} onChange={(e) => setField("shipping", { standardGstRate: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>GSTIN</label>
                <input maxLength={15} className={`${inputClass} font-mono uppercase`} value={draft.gstinNumber} onChange={(e) => setField("shipping", { gstinNumber: e.target.value.toUpperCase() })} placeholder="15-character GSTIN" />
              </div>
            </div>
          </AdminCard>
        </div>
      )}

      {/* ---------------------------------------------------------------- Payments */}
      {activeTab === "payments" && (
        <AdminCard title="Payment Processing Channels" subtitle="Which payment options customers see at checkout">
          <div className="space-y-4 max-w-2xl">
            <Switch
              checked={draft.enableOnlinePayments}
              onChange={(v) => setField("payments", { enableOnlinePayments: v })}
              label="Online payments (Cashfree)"
              description="UPI, cards and NetBanking through Cashfree Payments."
            />
            <p className="flex items-start gap-2 text-[11px] text-stone-500 px-1">
              <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
              Cashfree account keys are kept in the server's secure configuration, not on this screen.
            </p>

            <Switch
              checked={draft.enableCashOnDelivery}
              onChange={(v) => setField("payments", { enableCashOnDelivery: v })}
              label="Cash on Delivery (COD)"
              description="Let customers pay in cash or UPI when the parcel arrives."
            />
            <div className="max-w-xs">
              <label className={labelClass}>Maximum COD order value (₹)</label>
              <input
                type="number"
                min="0"
                step="1"
                className={inputClass}
                value={draft.maxCodLimit}
                disabled={!draft.enableCashOnDelivery}
                onChange={(e) => setField("payments", { maxCodLimit: e.target.value })}
              />
              <p className={hintClass}>Orders above this amount must be paid online. Enter 0 for no limit.</p>
            </div>
            {!draft.enableOnlinePayments && !draft.enableCashOnDelivery && (
              <p className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
                Keep at least one payment method on, or customers won't be able to check out.
              </p>
            )}
          </div>
        </AdminCard>
      )}

      {/* ---------------------------------------------------------------- Notifications */}
      {activeTab === "notifications" && (
        <AdminCard title="Automated Alerts & Communications" subtitle="Notification preferences for customers and warehouse staff">
          <div className="space-y-3 max-w-2xl">
            <p className="flex items-start gap-2 p-3 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-800">
              <Info className="w-4 h-4 shrink-0 mt-px" />
              Email and SMS sending isn't connected yet. Your choices are saved now and will take effect once a sending service is set up.
            </p>
            {[
              { key: "emailOnNewOrder", label: "Email the customer an order confirmation", desc: "An email with the order summary after checkout." },
              { key: "smsOnDispatch", label: "SMS the customer when the order is dispatched", desc: "A text message with the courier tracking link." },
              { key: "lowStockAlerts", label: "Email low-stock alerts to the warehouse", desc: "A heads-up when products fall below their reorder level." },
              { key: "dailySalesDigest", label: "Send a daily sales summary", desc: "A once-a-day recap of orders and revenue." },
            ].map((item) => (
              <Switch
                key={item.key}
                checked={draft[item.key]}
                onChange={(v) => setField("notifications", { [item.key]: v })}
                label={item.label}
                description={item.desc}
              />
            ))}
          </div>
        </AdminCard>
      )}
    </form>
  );
};

export const SettingsPage = () => {
  const { isAdminLoading, hasAdminLoadError, retryAdminLoad } = useAdmin();
  if (hasAdminLoadError("settings")) {
    return <AdminLoadError what="the settings" onRetry={() => retryAdminLoad("settings")} />;
  }
  return isAdminLoading("settings") ? <DetailPageSkeleton label="Loading settings" /> : <SettingsPageForm />;
};
