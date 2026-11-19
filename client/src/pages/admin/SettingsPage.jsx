import React, { useEffect, useMemo, useRef, useState } from "react";
import { Save, Check, CreditCard, Truck, Bell, Building, Plus, Trash2, Info, AlertTriangle, Ban } from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import { AdminCard } from "../../components/admin/common/AdminCard";
import { INDIAN_STATES } from "../../utils/shippingCalculator";
import { DetailPageSkeleton } from "../../components/common/Skeleton";
import { AdminLoadError } from "../../components/admin/common/AdminLoadError";

const TABS = [
  { id: "general", label: "General & Brand", icon: Building },
  { id: "shipping", label: "Shipping & Tax", icon: Truck },
  { id: "payments", label: "Payment Gateways", icon: CreditCard },
  { id: "cancellations", label: "Cancellations & Refunds", icon: Ban },
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
    originCountry: s.shipping?.originCountry ?? "India",
    originState: s.shipping?.originState ?? "",
    originCity: s.shipping?.originCity ?? "",
    originPincode: s.shipping?.originPincode ?? "",
    expressShippingFee: s.shipping?.expressShippingFee ?? 0,
    expressEnabled: s.shipping?.expressEnabled !== false,
    expressEstimate: s.shipping?.expressEstimate ?? "",
    expressRequiresCourierSupport: s.shipping?.expressRequiresCourierSupport !== false,
    expressMaxCourierDays: s.shipping?.expressMaxCourierDays ?? 2,
    dispatchLeadTime: s.shipping?.dispatchLeadTime ?? "",
    pinExceptions: (s.shipping?.pinExceptions || []).map((e) => ({ id: e.id, from: e.from ?? "", to: e.to ?? "", zoneId: e.zoneId ?? "", note: e.note ?? "" })),
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
      enabled: z.enabled !== false,
    })),
    taxIncludedInPrice: s.tax?.taxIncludedInPrice !== false,
    standardGstRate: s.tax?.standardGstRate ?? 0,
    shippingTaxMode: s.tax?.shippingTaxMode ?? "none",
    shippingGstRate: s.tax?.shippingGstRate ?? 0,
    legalName: s.tax?.legalName ?? "",
    invoicePrefix: s.tax?.invoicePrefix ?? "DA",
    gstinNumber: s.tax?.gstinNumber ?? "",
  },
  payments: {
    enableOnlinePayments: s.store?.enableOnlinePayments !== false,
    enableCashOnDelivery: s.store?.enableCashOnDelivery !== false,
    maxCodLimit: s.store?.maxCodLimit ?? 0,
  },
  cancellations: {
    enabled: s.cancellationPolicy?.enabled !== false,
    allowFullCancellation: s.cancellationPolicy?.allowFullCancellation !== false,
    allowPartialCancellation: s.cancellationPolicy?.allowPartialCancellation !== false,
    cancellationCutoff: s.cancellationPolicy?.cancellationCutoff || "before_pickup",
    requireAdminApproval: Boolean(s.cancellationPolicy?.requireAdminApproval),
    automaticOnlineRefund: s.cancellationPolicy?.automaticOnlineRefund !== false,
    allowCancellationForCOD: s.cancellationPolicy?.allowCancellationForCOD !== false,
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
    const { taxIncludedInPrice, standardGstRate, shippingTaxMode, shippingGstRate, legalName, invoicePrefix, gstinNumber, ...shipping } = d;
    return { shipping, tax: { taxIncludedInPrice, standardGstRate, shippingTaxMode, shippingGstRate, legalName, invoicePrefix, gstinNumber } };
  }
  if (tab === "payments") return { store: d };
  if (tab === "cancellations") return { cancellationPolicy: d };
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

// The recommended starting point: Local (the dispatch state), Rest of India, Remote. Applying it only fills the
// form; nothing changes in the live store until the admin presses Save.
const RECOMMENDED_REMOTE_STATES = [
  "Jammu and Kashmir", "Ladakh", "Assam", "Meghalaya", "Arunachal Pradesh", "Manipur", "Mizoram", "Nagaland",
  "Tripura", "Sikkim", "Andaman and Nicobar Islands", "Lakshadweep",
];
const recommendedZones = () => [
  { id: "zone-local", name: "Local (dispatch state)", tier: "Local", description: "Deliveries inside the dispatch state", baseFee: 40, freeThreshold: 499, deliveryDays: "1–3 business days", matchType: "origin", states: [], enabled: true },
  { id: "zone-rest", name: "Rest of India", tier: "Rest of India", description: "Every other state and union territory", baseFee: 80, freeThreshold: 799, deliveryDays: "3–6 business days", matchType: "rest", states: [], enabled: true },
  { id: "zone-remote", name: "Remote locations", tier: "Remote", description: "North-East, Jammu & Kashmir, Ladakh and island territories", baseFee: 120, freeThreshold: 1299, deliveryDays: "5–9 business days", matchType: "states", states: RECOMMENDED_REMOTE_STATES, enabled: true },
];

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

      <label className={`flex items-center gap-2 text-xs ${zone.matchType === "rest" ? "text-stone-400" : "text-stone-700 cursor-pointer"}`}>
        <input
          type="checkbox"
          checked={zone.enabled !== false}
          disabled={zone.matchType === "rest"}
          onChange={(e) => onChange({ enabled: e.target.checked })}
          className="rounded border-stone-300 text-[#173D2A] focus:ring-[#173D2A]"
        />
        <span>
          Deliver to this zone
          {zone.matchType === "rest" ? " (always on: it covers every address no other zone claims)" : zone.enabled === false ? " (off: customers here see \"we don't deliver to this area\")" : ""}
        </span>
      </label>

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
  const { storeSettings, saveStoreSettings, fetchIntegrationStatus } = useAdmin();
  // Is this server really connected to Cashfree and Shiprocket? (null = still loading / an older server)
  const [integrations, setIntegrations] = useState(undefined);
  useEffect(() => {
    let cancelled = false;
    fetchIntegrationStatus?.().then((status) => !cancelled && setIntegrations(status));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const saved = useMemo(() => editable(storeSettings), [storeSettings]);
  const [drafts, setDrafts] = useState(saved);
  const [activeTab, setActiveTab] = useState("general");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null); // { text, isError }

  const isDirty = (tab) => JSON.stringify(saved[tab]) !== JSON.stringify(drafts[tab]);
  const draft = drafts[activeTab];
  const setField = (tab, patch) => setDrafts((prev) => ({ ...prev, [tab]: { ...prev[tab], ...patch } }));

  // One timer at a time: an older message's timer must not hide a newer message (e.g. an error right after a save)
  const toastTimer = useRef(null);
  const notify = (text, isError = false) => {
    setToast({ text, isError });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), isError ? 8000 : 4000);
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
        { id: `zone-${Date.now()}`, name: "New zone", tier: "Standard", description: "", baseFee: 0, freeThreshold: 0, deliveryDays: "", matchType: "states", states: [], enabled: true },
      ],
    });
  const removeZone = (id) => setField("shipping", { zones: drafts.shipping.zones.filter((z) => z.id !== id) });

  const updatePinException = (id, patch) =>
    setField("shipping", { pinExceptions: drafts.shipping.pinExceptions.map((e) => (e.id === id ? { ...e, ...patch } : e)) });
  const addPinException = () =>
    setField("shipping", {
      pinExceptions: [...drafts.shipping.pinExceptions, { id: `pin-${Date.now()}`, from: "", to: "", zoneId: drafts.shipping.zones.find((z) => z.tier === "Remote")?.id || "", note: "" }],
    });
  const removePinException = (id) => setField("shipping", { pinExceptions: drafts.shipping.pinExceptions.filter((e) => e.id !== id) });

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
          {/* A. Dispatch location */}
          <AdminCard title="A. Dispatch Location" subtitle="Where orders ship from. The dispatch state is the Local zone and decides whether GST is CGST + SGST or IGST">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Country</label>
                <input className={`${inputClass} bg-stone-100 text-stone-500`} value={draft.originCountry} readOnly />
              </div>
              <div>
                <label className={labelClass}>State</label>
                <select className={inputClass} value={draft.originState} onChange={(e) => setField("shipping", { originState: e.target.value })}>
                  {INDIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>City</label>
                <input className={inputClass} value={draft.originCity} onChange={(e) => setField("shipping", { originCity: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Dispatch PIN code</label>
                <input inputMode="numeric" maxLength={6} className={`${inputClass} font-mono`} value={draft.originPincode} onChange={(e) => setField("shipping", { originPincode: e.target.value.replace(/\D/g, "") })} />
                <p className={hintClass}>The courier's serviceability check starts from this PIN code.</p>
              </div>
              <div>
                <label className={labelClass}>Handling time before dispatch</label>
                <input className={inputClass} value={draft.dispatchLeadTime} onChange={(e) => setField("shipping", { dispatchLeadTime: e.target.value })} placeholder="e.g. 24-48 Hours" />
              </div>
            </div>
          </AdminCard>

          {/* B. Shipping rates */}
          <AdminCard
            title="B. Shipping Rates"
            subtitle="The delivery fee and free-delivery minimum for each zone. Free delivery is judged on the product total after discounts"
            action={
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Fill the form with the recommended three zones (Local, Rest of India, Remote)? Nothing changes in your store until you press Save.")) {
                      setField("shipping", { zones: recommendedZones(), pinExceptions: [] });
                    }
                  }}
                  className="text-xs font-semibold text-stone-600 hover:underline"
                >
                  Use recommended 3 zones
                </button>
                <button type="button" onClick={addZone} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#173D2A] hover:underline">
                  <Plus className="w-3.5 h-3.5" /> Add zone
                </button>
              </div>
            }
          >
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-xl border border-stone-200">
                <table className="w-full text-xs">
                  <thead className="bg-stone-50 text-stone-500 text-left">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Zone</th>
                      <th className="px-3 py-2 font-semibold">Shipping fee</th>
                      <th className="px-3 py-2 font-semibold">Free from</th>
                      <th className="px-3 py-2 font-semibold">Delivery estimate</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {drafts.shipping.zones.map((z) => (
                      <tr key={z.id}>
                        <td className="px-3 py-2 font-medium text-stone-800">{z.name}</td>
                        <td className="px-3 py-2">₹{Number(z.baseFee) || 0}</td>
                        <td className="px-3 py-2">₹{Number(z.freeThreshold) || 0}</td>
                        <td className="px-3 py-2">{z.deliveryDays}</td>
                        <td className="px-3 py-2">{z.enabled === false ? <span className="text-rose-600 font-semibold">Off</span> : <span className="text-emerald-700 font-semibold">On</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

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

              {/* PIN-code exceptions */}
              <div className="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-stone-900">PIN code exceptions</h4>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Send a PIN code (or a range) to a specific zone, whatever its state says. Exceptions win over state rules. Use the same PIN in both boxes for a single PIN code.
                    </p>
                  </div>
                  <button type="button" onClick={addPinException} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#173D2A] hover:underline shrink-0">
                    <Plus className="w-3.5 h-3.5" /> Add exception
                  </button>
                </div>
                {drafts.shipping.pinExceptions.length === 0 ? (
                  <p className="text-xs text-stone-400">No exceptions. Every address follows its state's zone.</p>
                ) : (
                  <div className="space-y-2">
                    {drafts.shipping.pinExceptions.map((ex) => (
                      <div key={ex.id} className="grid grid-cols-2 md:grid-cols-[1fr_1fr_1.4fr_1.6fr_auto] gap-2 items-end">
                        <div>
                          <label className={labelClass}>From PIN</label>
                          <input inputMode="numeric" maxLength={6} className={`${inputClass} font-mono`} value={ex.from} onChange={(e) => updatePinException(ex.id, { from: e.target.value.replace(/\D/g, "") })} />
                        </div>
                        <div>
                          <label className={labelClass}>To PIN</label>
                          <input inputMode="numeric" maxLength={6} className={`${inputClass} font-mono`} value={ex.to} onChange={(e) => updatePinException(ex.id, { to: e.target.value.replace(/\D/g, "") })} />
                        </div>
                        <div>
                          <label className={labelClass}>Zone</label>
                          <select className={inputClass} value={ex.zoneId} onChange={(e) => updatePinException(ex.id, { zoneId: e.target.value })}>
                            <option value="">Choose zone</option>
                            {drafts.shipping.zones.map((z) => (
                              <option key={z.id} value={z.id}>
                                {z.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className={labelClass}>Note (optional)</label>
                          <input className={inputClass} value={ex.note} onChange={(e) => updatePinException(ex.id, { note: e.target.value })} placeholder="e.g. Leh district" />
                        </div>
                        <button
                          type="button"
                          onClick={() => removePinException(ex.id)}
                          aria-label="Remove PIN code exception"
                          className="p-2 rounded-lg border border-stone-200 text-stone-500 hover:text-rose-600 hover:bg-rose-50 transition-colors justify-self-start"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </AdminCard>

          {/* C. Express delivery */}
          <AdminCard title="C. Express Delivery" subtitle="An extra surcharge on top of the zone's standard fee (and the only charge when standard delivery is free)">
            <div className="space-y-4 max-w-3xl">
              <Switch
                checked={draft.expressEnabled}
                onChange={(v) => setField("shipping", { expressEnabled: v })}
                label="Offer express delivery"
                description="Customers choose it at checkout, only where it is available for their PIN code."
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Express surcharge (₹)</label>
                  <input type="number" min="0" step="1" className={inputClass} value={draft.expressShippingFee} onChange={(e) => setField("shipping", { expressShippingFee: e.target.value })} />
                  <p className={hintClass}>Set once here. Shown everywhere the same: express total = zone fee + this surcharge.</p>
                </div>
                <div>
                  <label className={labelClass}>Express delivery estimate</label>
                  <input className={inputClass} value={draft.expressEstimate} onChange={(e) => setField("shipping", { expressEstimate: e.target.value })} placeholder="e.g. 1–2 business days" />
                </div>
              </div>
              <Switch
                checked={draft.expressRequiresCourierSupport}
                onChange={(v) => setField("shipping", { expressRequiresCourierSupport: v })}
                label="Only where the courier confirms a fast service"
                description="Recommended. Express is offered for a PIN code only if the courier's quickest delivery there is within the limit below. If the courier cannot be reached, express is not offered."
              />
              {draft.expressRequiresCourierSupport && (
                <div className="max-w-xs">
                  <label className={labelClass}>Courier's quickest delivery must be within (days)</label>
                  <input type="number" min="1" max="14" step="1" className={inputClass} value={draft.expressMaxCourierDays} onChange={(e) => setField("shipping", { expressMaxCourierDays: e.target.value })} />
                </div>
              )}
            </div>
          </AdminCard>

          {/* D. GST */}
          <AdminCard title="D. GST (Tax)" subtitle="Each product can have its own GST rate and HSN code in the product form; products without one use the default below">
            <div className="space-y-4 max-w-3xl">
              <div>
                <label className={labelClass}>How product prices are set</label>
                <select className={inputClass} value={draft.taxIncludedInPrice ? "inclusive" : "exclusive"} onChange={(e) => setField("shipping", { taxIncludedInPrice: e.target.value === "inclusive" })}>
                  <option value="inclusive">Prices include GST (the tax is shown inside the price)</option>
                  <option value="exclusive">Prices exclude GST (GST is added at checkout)</option>
                </select>
                {!draft.taxIncludedInPrice && (
                  <p className="flex items-start gap-2 mt-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
                    Customers will see GST added to the total at checkout. Product prices on the shop pages are shown as entered, so label them as "excl. GST" yourself.
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Default GST rate (%)</label>
                  <input type="number" min="0" max="40" step="0.5" className={inputClass} value={draft.standardGstRate} onChange={(e) => setField("shipping", { standardGstRate: e.target.value })} />
                  <p className={hintClass}>Used for products that have no GST rate of their own.</p>
                </div>
                <div>
                  <label className={labelClass}>GSTIN</label>
                  <input maxLength={15} className={`${inputClass} font-mono uppercase`} value={draft.gstinNumber} onChange={(e) => setField("shipping", { gstinNumber: e.target.value.toUpperCase() })} placeholder="15-character GSTIN" />
                  <p className={hintClass}>Leave empty if you are not GST-registered: invoices are then not marked as tax invoices.</p>
                </div>
                <div>
                  <label className={labelClass}>Registered business name</label>
                  <input className={inputClass} value={draft.legalName} onChange={(e) => setField("shipping", { legalName: e.target.value })} placeholder="As on your GST registration" />
                </div>
                <div>
                  <label className={labelClass}>Invoice number prefix</label>
                  <input maxLength={10} className={`${inputClass} font-mono uppercase`} value={draft.invoicePrefix} onChange={(e) => setField("shipping", { invoicePrefix: e.target.value.toUpperCase() })} />
                </div>
              </div>
              <div>
                <label className={labelClass}>GST on delivery charges</label>
                <select className={inputClass} value={draft.shippingTaxMode} onChange={(e) => setField("shipping", { shippingTaxMode: e.target.value })}>
                  <option value="none">No separate GST line on delivery (current default)</option>
                  <option value="fixed">Apply a fixed GST rate to delivery charges</option>
                </select>
                {draft.shippingTaxMode === "fixed" && (
                  <div className="mt-2 max-w-xs">
                    <label className={labelClass}>Delivery GST rate (%)</label>
                    <input type="number" min="0" max="40" step="0.5" className={inputClass} value={draft.shippingGstRate} onChange={(e) => setField("shipping", { shippingGstRate: e.target.value })} />
                  </div>
                )}
                <p className={hintClass}>
                  How delivery is taxed depends on your business and invoicing. Confirm the right treatment with your accountant before changing this.
                </p>
              </div>
            </div>
          </AdminCard>
        </div>
      )}

      {/* ---------------------------------------------------------------- Payments */}
      {activeTab === "payments" && (
        <div className="space-y-6">
        <AdminCard title="Live connection status" subtitle="Is this server really talking to Cashfree and Shiprocket? (no keys are shown here)">
          {integrations === undefined ? (
            <p className="text-xs text-stone-400">Checking...</p>
          ) : integrations === null ? (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
              This server could not report its status. It is probably running an older version of the software: deploy the latest backend, then reload this page.
            </p>
          ) : (
            <div className="space-y-3 max-w-2xl text-sm">
              {[
                { name: "Cashfree (online payments)", live: integrations.cashfree.live, mode: integrations.cashfree.mode, fix: "Set CASHFREE_APP_ID, CASHFREE_SECRET_KEY and CASHFREE_ENV=production in the server settings, then restart." },
                { name: "Shiprocket (courier)", live: integrations.shiprocket.live, mode: integrations.shiprocket.mode, fix: "Set SHIPROCKET_EMAIL, SHIPROCKET_PASSWORD and SHIPROCKET_PICKUP_LOCATION in the server settings, then restart." },
              ].map((row) => (
                <div key={row.name} className={`p-3 rounded-xl border ${row.live ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-stone-900">{row.name}</span>
                    <span className={`text-xs font-bold ${row.live ? "text-emerald-800" : "text-rose-700"}`}>{row.live ? "CONNECTED" : "NOT CONNECTED"}</span>
                  </div>
                  <p className="text-xs text-stone-600 mt-0.5">Mode: {row.mode}</p>
                  {!row.live && <p className="text-xs text-rose-700 mt-1">Customers cannot really pay / ship while this shows fake mode. {row.fix}</p>}
                </div>
              ))}
              {integrations.cashfree.live && integrations.cashfree.environment === "production" && (!integrations.cashfree.webhookUrlIsHttps || !integrations.cashfree.returnAddressIsHttps) && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  Cashfree needs https addresses: set CASHFREE_WEBHOOK_URL (https://&lt;your site&gt;/api/v1/webhooks/cashfree) and CLIENT_ORIGIN (your https storefront address).
                </p>
              )}
              {!integrations.deployedAsLiveServer && <p className="text-[11px] text-stone-400">This server is running in local/development mode (NODE_ENV={integrations.nodeEnv}).</p>}
            </div>
          )}
        </AdminCard>

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
        </div>
      )}

      {/* ---------------------------------------------------------------- Cancellations & Refunds */}
      {activeTab === "cancellations" && (
        <div className="space-y-6">
          <AdminCard
            title="Customer Order Cancellation & Policy Rules"
            subtitle="Configure cancellation self-service, approval workflows, and automated Cashfree refunds"
          >
            <div className="space-y-4 max-w-2xl">
              <Switch
                checked={draft.enabled}
                onChange={(v) => setField("cancellations", { enabled: v })}
                label="Enable Customer Cancellation System"
                description="Allow customers to request order cancellations from their account before courier handover."
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Switch
                  checked={draft.allowFullCancellation}
                  disabled={!draft.enabled}
                  onChange={(v) => setField("cancellations", { allowFullCancellation: v })}
                  label="Allow Full Order Cancellation"
                  description="Customers can cancel the entire order in one click."
                />
                <Switch
                  checked={draft.allowPartialCancellation}
                  disabled={!draft.enabled}
                  onChange={(v) => setField("cancellations", { allowPartialCancellation: v })}
                  label="Allow Partial Cancellation"
                  description="Cancel specific items and quantities from multi-item orders."
                />
              </div>

              <div className="max-w-md">
                <label className={labelClass}>Cancellation Cutoff Window</label>
                <select
                  disabled={!draft.enabled}
                  className={inputClass}
                  value={draft.cancellationCutoff}
                  onChange={(e) => setField("cancellations", { cancellationCutoff: e.target.value })}
                >
                  <option value="before_pickup">Before Courier Handover / Pickup (Recommended)</option>
                  <option value="before_shipped">Before Shipment Manifest Creation</option>
                  <option value="before_packed">Before Warehouse Packing / Processing</option>
                </select>
                <p className={hintClass}>
                  Once the parcel is physically handed to Shiprocket courier (Pickup done / In transit), cancellations are strictly blocked.
                </p>
              </div>

              <Switch
                checked={draft.allowCancellationForCOD}
                disabled={!draft.enabled}
                onChange={(v) => setField("cancellations", { allowCancellationForCOD: v })}
                label="Allow Cancellation for Cash on Delivery (COD)"
                description="COD orders are cancelled immediately without issuing financial gateway refunds."
              />

              <Switch
                checked={draft.requireAdminApproval}
                disabled={!draft.enabled}
                onChange={(v) => setField("cancellations", { requireAdminApproval: v })}
                label="Require Manual Admin Review / Approval"
                description="When enabled, customer cancellation requests remain pending until approved in Admin. When disabled, eligible requests execute automatically."
              />

              <Switch
                checked={draft.automaticOnlineRefund}
                disabled={!draft.enabled}
                onChange={(v) => setField("cancellations", { automaticOnlineRefund: v })}
                label="Automatic Cashfree Online Refund"
                description="Automatically invoke Cashfree Refund API for captured payments upon cancellation execution."
              />

              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-emerald-700" />
                  Delivered Order Policy Reminder
                </div>
                <p className="text-emerald-800 leading-relaxed">
                  Delivered orders are strictly prohibited from being cancelled. Once an order is delivered, customers must use the Returns & Exchange workflow.
                </p>
              </div>
            </div>
          </AdminCard>
        </div>
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
