import React, { useState } from "react";
import { Save, Settings, Shield, Check, CreditCard, Truck, Bell, Building, MapPin, Info } from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import { AdminCard } from "../../components/admin/common/AdminCard";
import { INDIAN_STATES, DEFAULT_SHIPPING_ZONES } from "../../utils/shippingCalculator";

export const SettingsPage = () => {
  const { storeSettings, saveStoreSettings } = useAdmin();
  const [formData, setFormData] = useState(storeSettings);
  const [activeTab, setActiveTab] = useState("general");
  const [toastMessage, setToastMessage] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleNestedChange = (group, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [group]: {
        ...prev[group],
        [field]: value,
      },
    }));
  };

  const handleZoneChange = (zoneId, field, value) => {
    const currentZones = formData.shipping?.zones || DEFAULT_SHIPPING_ZONES;
    const updated = currentZones.map((z) =>
      z.id === zoneId ? { ...z, [field]: value } : z
    );
    setFormData((prev) => ({
      ...prev,
      shipping: {
        ...prev.shipping,
        zones: updated,
      },
    }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    saveStoreSettings(formData);
    setToastMessage("Store settings successfully saved!");
    setTimeout(() => setToastMessage(""), 3000);
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 font-sans tracking-tight">
            Store & Platform Settings
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Configure global store identity, payment processors, tax thresholds, and notifications.
          </p>
        </div>

        <button
          type="submit"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#173D2A] text-white hover:bg-[#0B2416] text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Save className="w-4 h-4" />
          <span>Save Settings</span>
        </button>
      </div>

      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1 border-b border-stone-200 pb-3">
        {[
          { id: "general", label: "General & Brand", icon: Building },
          { id: "shipping", label: "Shipping & Tax", icon: Truck },
          { id: "payments", label: "Payment Gateways", icon: CreditCard },
          { id: "notifications", label: "Alerts & Notifications", icon: Bell },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === tab.id
                  ? "bg-[#173D2A] text-white"
                  : "text-stone-600 hover:bg-stone-200/60"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab: General */}
      {activeTab === "general" && (
        <AdminCard title="General Store Information" subtitle="Brand coordinates and customer contact channels">
          <div className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Brand Store Name
                </label>
                <input
                  type="text"
                  name="storeName"
                  value={formData.storeName || "Divyam Ayurveda"}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Support Email Address
                </label>
                <input
                  type="email"
                  name="supportEmail"
                  value={formData.supportEmail || "support@divyamayurveda.com"}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Customer Care Phone
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone || "+91 1800 258 7412"}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Default Currency
                </label>
                <input
                  type="text"
                  name="currency"
                  value={formData.currency || "INR (₹)"}
                  onChange={handleChange}
                  disabled
                  className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-stone-100 text-stone-500 font-mono text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Registered Herbal Dispensary & Headquarters
              </label>
              <textarea
                rows={2}
                name="address"
                value={
                  formData.address ||
                  "Divyam Ayurveda Bhavan, Sector 4, Haridwar Industrial Area, Uttarakhand - 249403, India"
                }
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white"
              />
            </div>
          </div>
        </AdminCard>
      )}

      {/* Tab: Shipping & Tax */}
      {activeTab === "shipping" && (
        <div className="space-y-6">
          {/* Warehouse Origin Hub */}
          <AdminCard
            title="Dispatch Warehouse & Fulfillment Origin"
            subtitle="The primary dispatch hub used to compute distance zones and place of supply for GST"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Origin State (Home Base)
                </label>
                <select
                  value={formData.shipping?.originState || "Karnataka"}
                  onChange={(e) =>
                    handleNestedChange("shipping", "originState", e.target.value)
                  }
                  className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white text-stone-800"
                >
                  {INDIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-stone-500 mt-1">
                  Orders within this state are treated as Local (Intra-State GST).
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Origin City / Hub
                </label>
                <input
                  type="text"
                  value={formData.shipping?.originCity || "Bengaluru"}
                  onChange={(e) =>
                    handleNestedChange("shipping", "originCity", e.target.value)
                  }
                  className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Origin Dispatch PIN Code
                </label>
                <input
                  type="text"
                  value={formData.shipping?.originPincode || "560038"}
                  onChange={(e) =>
                    handleNestedChange("shipping", "originPincode", e.target.value)
                  }
                  className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white font-mono text-xs"
                />
              </div>
            </div>
          </AdminCard>

          {/* Distance-Based Shipping Zones Matrix */}
          <AdminCard
            title="State Distance & Shipping Rates Matrix"
            subtitle="Configure tier-based shipping charges and free delivery minimum order amounts per zone"
            noPadding={true}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-700">
                <thead className="bg-stone-50/80 text-[11px] font-semibold uppercase tracking-wider text-stone-500 border-b border-stone-200">
                  <tr>
                    <th className="px-4 py-3 min-w-[200px]">Shipping Zone Tier</th>
                    <th className="px-4 py-3 min-w-[180px]">Delivery Coverage & Scope</th>
                    <th className="px-4 py-3 text-center min-w-[130px]">Base Fee (₹)</th>
                    <th className="px-4 py-3 text-center min-w-[160px]">Free Shipping Min (₹)</th>
                    <th className="px-4 py-3 text-center min-w-[140px]">Transit Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {(formData.shipping?.zones || DEFAULT_SHIPPING_ZONES).map((z) => (
                    <tr key={z.id} className="hover:bg-stone-50/50">
                      <td className="px-4 py-3.5 font-medium text-stone-900">
                        <div className="font-semibold text-stone-900">{z.name}</div>
                        <span className="inline-block px-2 py-0.5 mt-1 rounded bg-stone-100 text-[10px] font-mono text-stone-600">
                          {z.tier}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-stone-500 text-[11px]">
                        {z.description}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="inline-flex items-center gap-1">
                          <span className="text-stone-400">₹</span>
                          <input
                            type="number"
                            min="0"
                            value={z.baseFee}
                            onChange={(e) =>
                              handleZoneChange(z.id, "baseFee", Number(e.target.value))
                            }
                            className="w-20 px-2 py-1 text-xs text-center rounded-lg border border-stone-300 bg-white font-semibold text-stone-900"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="inline-flex items-center gap-1">
                          <span className="text-stone-400">₹</span>
                          <input
                            type="number"
                            min="0"
                            value={z.freeThreshold}
                            onChange={(e) =>
                              handleZoneChange(z.id, "freeThreshold", Number(e.target.value))
                            }
                            className="w-24 px-2 py-1 text-xs text-center rounded-lg border border-stone-300 bg-white font-semibold text-stone-900"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <input
                          type="text"
                          value={z.deliveryDays}
                          onChange={(e) =>
                            handleZoneChange(z.id, "deliveryDays", e.target.value)
                          }
                          className="w-28 px-2 py-1 text-[11px] text-center rounded-lg border border-stone-300 bg-white text-stone-700"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AdminCard>

          {/* GST Tax Compliance */}
          <AdminCard
            title="GST & Tax Compliance Rules"
            subtitle="Automated split of CGST, SGST, and IGST based on customer delivery destination"
          >
            <div className="space-y-4 max-w-2xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Standard Ayurvedic Herbal GST Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="28"
                    value={formData.tax?.standardGstRate ?? 12}
                    onChange={(e) =>
                      handleNestedChange("tax", "standardGstRate", Number(e.target.value))
                    }
                    className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white"
                  />
                  <span className="text-[11px] text-stone-400">
                    Typically 12% for Classical and Proprietary Ayurvedic Medicine.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    GST Identification Number (GSTIN)
                  </label>
                  <input
                    type="text"
                    value={formData.tax?.gstinNumber || "29AABCD1234E1Z5"}
                    onChange={(e) =>
                      handleNestedChange("tax", "gstinNumber", e.target.value)
                    }
                    className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white font-mono text-xs"
                  />
                </div>
              </div>

              {/* Informative Tax Split Preview */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-900 font-semibold text-xs">
                  <Info className="w-4 h-4 text-emerald-700" />
                  <span>Indian GST Rule Computation Mode</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-emerald-800">
                  <div className="p-3 bg-white/80 rounded-xl border border-emerald-100">
                    <span className="font-bold block text-stone-900 mb-0.5">
                      Intra-State Orders ({formData.shipping?.originState || "Karnataka"}):
                    </span>
                    <p className="text-[11px] text-stone-600">
                      Split equally:{" "}
                      <span className="font-semibold text-emerald-900">
                        {((formData.tax?.standardGstRate ?? 12) / 2).toFixed(1)}% CGST +{" "}
                        {((formData.tax?.standardGstRate ?? 12) / 2).toFixed(1)}% SGST
                      </span>
                    </p>
                  </div>
                  <div className="p-3 bg-white/80 rounded-xl border border-emerald-100">
                    <span className="font-bold block text-stone-900 mb-0.5">
                      Inter-State Orders (Outside {formData.shipping?.originState || "Karnataka"}):
                    </span>
                    <p className="text-[11px] text-stone-600">
                      Levied wholly:{" "}
                      <span className="font-semibold text-emerald-900">
                        {(formData.tax?.standardGstRate ?? 12)}% IGST
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </AdminCard>
        </div>
      )}

      {/* Tab: Payments */}
      {activeTab === "payments" && (
        <AdminCard title="Payment Processing Channels" subtitle="Manage online gateways and cash collections">
          <div className="space-y-4 max-w-2xl">
            <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/60 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-stone-900 text-sm">
                    Razorpay & UPI Payments
                  </h4>
                  <p className="text-xs text-stone-500">
                    Accept UPI (GPay, PhonePe, Paytm), NetBanking, and Debit/Credit cards.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.payments?.razorpayEnabled ?? true}
                  onChange={(e) =>
                    handleNestedChange("payments", "razorpayEnabled", e.target.checked)
                  }
                  className="w-4 h-4 rounded border-stone-300 text-[#173D2A] focus:ring-[#173D2A]"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/60 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-stone-900 text-sm">
                    Cash on Delivery (COD)
                  </h4>
                  <p className="text-xs text-stone-500">
                    Allow customers to pay with cash upon doorstep delivery.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.payments?.codEnabled ?? true}
                  onChange={(e) =>
                    handleNestedChange("payments", "codEnabled", e.target.checked)
                  }
                  className="w-4 h-4 rounded border-stone-300 text-[#173D2A] focus:ring-[#173D2A]"
                />
              </div>
            </div>
          </div>
        </AdminCard>
      )}

      {/* Tab: Notifications */}
      {activeTab === "notifications" && (
        <AdminCard title="Automated Alerts & Communications" subtitle="Notification settings for customers and warehouse staff">
          <div className="space-y-3 max-w-2xl">
            {[
              {
                key: "orderConfirmation",
                label: "Send Customer Email Order Confirmation",
                desc: "Dispatches automated email invoice upon successful checkout.",
              },
              {
                key: "dispatchSMS",
                label: "Send Courier Dispatch SMS with Tracking Link",
                desc: "Sends real-time SMS tracking updates through BlueDart/Delhivery API.",
              },
              {
                key: "lowStockAlert",
                label: "Send Warehouse Manager Low-Stock Email Alerts",
                desc: "Sends daily digest when herbal products fall below reorder thresholds.",
              },
            ].map((item) => (
              <label
                key={item.key}
                className="flex items-start justify-between p-3 rounded-xl border border-stone-200 hover:bg-stone-50 cursor-pointer transition-colors"
              >
                <div>
                  <span className="font-semibold text-stone-900 text-xs block">
                    {item.label}
                  </span>
                  <span className="text-xs text-stone-500">{item.desc}</span>
                </div>
                <input
                  type="checkbox"
                  defaultChecked={true}
                  className="w-4 h-4 rounded border-stone-300 text-[#173D2A] focus:ring-[#173D2A] mt-1"
                />
              </label>
            ))}
          </div>
        </AdminCard>
      )}
    </form>
  );
};

