import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Leaf, Lock, Mail, ArrowRight, ShieldCheck, Sparkles, Store } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export const AdminLoginPage = () => {
  const [email, setEmail] = useState("admin@divyamayurveda.demo");
  const [password, setPassword] = useState("admin123");
  const [selectedRole, setSelectedRole] = useState("Super Admin");
  const [error, setError] = useState("");
  const { loginAsAdmin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setError("Please provide a valid administrative email address.");
      return;
    }
    loginAsAdmin(email, selectedRole);
    navigate("/admin/dashboard");
  };

  const handleQuickDemoLogin = (role = "Super Admin") => {
    loginAsAdmin(null, role);
    navigate("/admin/dashboard");
  };

  return (
    <div className="min-h-screen bg-[#0B2416] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle botanical background accents */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#173D2A]/60 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-[#386B40]/30 blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#173D2A] border border-[#386B40] text-white shadow-lg mb-4">
            <Leaf size={28} className="text-[#A9D18E]" />
          </div>
          <h2 className="font-serif text-3xl font-bold tracking-tight text-white">
            Divyam Ayurveda
          </h2>
          <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-[#A9D18E]">
            Store Administration Control Center
          </p>
        </div>

        <div className="mt-8 bg-white/95 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/20">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#E5E7DF]">
            <span className="text-xs font-bold uppercase tracking-wider text-[#173D2A] flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-[#386B40]" />
              <span>Admin Authentication</span>
            </span>
            <span className="text-[11px] text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
              Demo Mode
            </span>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-[#171A17] mb-1">
                Admin Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@divyamayurveda.demo"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-stone-50 border border-[#E5E7DF] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#386B40]"
                />
                <Mail size={16} className="absolute left-3 top-3 text-stone-400" />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#171A17] mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-stone-50 border border-[#E5E7DF] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#386B40]"
                />
                <Lock size={16} className="absolute left-3 top-3 text-stone-400" />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#171A17] mb-1">
                Administrative Role
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-3 py-2.5 bg-stone-50 border border-[#E5E7DF] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#386B40]"
              >
                <option value="Super Admin">Super Admin (Full Access)</option>
                <option value="Product Manager">Product Manager (Catalog &amp; Inventory)</option>
                <option value="Order Manager">Order Manager (Sales &amp; Logistics)</option>
                <option value="Content Manager">Content Manager (Storefront &amp; Blog)</option>
                <option value="Support Specialist">Support Specialist (Reviews &amp; Tickets)</option>
                <option value="Analyst">Analyst (Analytics &amp; Reports)</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-[#173D2A] hover:bg-[#0B2416] text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md mt-2"
            >
              <span>Sign In to Dashboard</span>
              <ArrowRight size={15} />
            </button>

            {/* Instant Demo Login Button */}
            <div className="pt-3 border-t border-[#E5E7DF] space-y-2">
              <span className="block text-[11px] font-bold text-center text-stone-400 uppercase tracking-wider">
                Instant Administrator Access
              </span>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin("Super Admin")}
                className="w-full py-2.5 px-4 bg-[#386B40] hover:bg-[#173D2A] text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs"
              >
                <Sparkles size={15} />
                <span>Instant Demo Login (Super Admin)</span>
              </button>

              {/* Quick role test pills */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1 text-[11px]">
                <span className="text-stone-400">Test as:</span>
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin("Product Manager")}
                  className="px-2 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700"
                >
                  Product Mgr
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin("Order Manager")}
                  className="px-2 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700"
                >
                  Order Mgr
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin("Analyst")}
                  className="px-2 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700"
                >
                  Analyst
                </button>
              </div>
            </div>
          </form>

          <div className="mt-6 pt-4 border-t border-[#E5E7DF] flex items-center justify-between text-xs text-stone-500">
            <Link
              to="/"
              className="flex items-center gap-1 hover:text-[#173D2A] transition-colors"
            >
              <Store size={14} />
              <span>Back to Storefront</span>
            </Link>
            <Link to="/login" className="hover:text-[#173D2A] transition-colors">
              Customer Sign In &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

