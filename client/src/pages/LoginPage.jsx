import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Lock, Mail, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { PhoneInput } from "../components/common/PhoneInput";
import { DEFAULT_COUNTRY, validateMobile } from "../utils/phone";

export const LoginPage = () => {
  const [method, setMethod] = useState("email"); // "email" | "mobile"
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState({ iso: DEFAULT_COUNTRY.iso, countryCode: DEFAULT_COUNTRY.dial, number: "" });
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (method === "email") {
      if (!email || !email.includes("@")) {
        setError("Please enter a valid email address.");
        return;
      }
    } else {
      const check = validateMobile(mobile.countryCode, mobile.number);
      if (!check.ok) {
        setError(check.message);
        return;
      }
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);
    try {
      const result = await login(
        method === "email" ? email : { phoneCountryCode: mobile.countryCode, phone: mobile.number },
        password
      );

      if (result.success) {
        // If the authenticated user is an administrator, redirect straight to the Admin Dashboard
        if (result.isAdmin) {
          navigate("/admin/dashboard", { replace: true });
        } else {
          // If customer, redirect to previous intended destination or account profile
          const redirectPath = location.state?.from || "/account";
          navigate(redirectPath, { replace: true });
        }
      } else {
        setError(result.error || (method === "email" ? "Invalid email address or password." : "Invalid mobile number or password."));
      }
    } catch (err) {
      setError("An unexpected error occurred during sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#FBFAF6] min-h-screen py-10">
      <div className="max-w-md mx-auto px-4 sm:px-6">
        <Breadcrumbs items={[{ label: "Login" }]} />

        <div className="bg-white rounded-3xl border border-[#E5E7DF] p-6 sm:p-8 shadow-xs mt-4 animate-in fade-in zoom-in-98 duration-300">
          <div className="text-center mb-6">
            <Link to="/" className="inline-block mb-3 hover:opacity-90 transition-opacity" aria-label="Divyam Ayurveda">
              <img
                src="/images/Logo/Logo.png"
                alt="Divyam Ayurveda" width="669" height="373"
                className="h-14 sm:h-16 w-auto mx-auto object-contain"
              />
            </Link>
            <h1 className="font-heading tracking-tight text-2xl sm:text-3xl font-bold text-[#171A17]">
              Sign In
            </h1>
            <p className="text-xs sm:text-sm text-[#666B64] mt-1">
              Sign in with your email or mobile number and password to access your account.
            </p>
          </div>

          {location.state?.message && (
            <div className="mb-4 p-3 rounded-xl bg-amber-50 text-amber-900 text-xs border border-amber-200 flex items-center gap-2">
              <Lock size={15} className="text-amber-700 shrink-0" />
              <span>{location.state.message}</span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div role="tablist" aria-label="Sign in with" className="grid grid-cols-2 gap-1 p-1 bg-stone-100 rounded-xl">
              {[
                { id: "email", label: "Email" },
                { id: "mobile", label: "Mobile number" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={method === tab.id}
                  onClick={() => {
                    setMethod(tab.id);
                    setError("");
                  }}
                  disabled={loading}
                  className={`py-2 rounded-lg font-semibold transition-colors cursor-pointer ${
                    method === tab.id ? "bg-white text-[#173D2A] shadow-xs" : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {method === "email" ? (
              <div>
                <label htmlFor="login-email" className="block font-semibold text-[#171A17] mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    autoComplete="email"
                    required
                    disabled={loading}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-stone-50 border border-[#E5E7DF] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#386B40] disabled:opacity-60"
                  />
                  <Mail size={16} className="absolute left-3 top-3 text-stone-400" />
                </div>
              </div>
            ) : (
              <div>
                <label htmlFor="login-mobile" className="block font-semibold text-[#171A17] mb-1">
                  Mobile Number
                </label>
                <PhoneInput id="login-mobile" value={mobile} onChange={setMobile} disabled={loading} />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-[#171A17]">Password</label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] text-[#386B40] hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-stone-50 border border-[#E5E7DF] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#386B40] disabled:opacity-60"
                />
                <Lock size={16} className="absolute left-3 top-3 text-stone-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-[#173D2A] hover:bg-[#0B2416] text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs disabled:opacity-70 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-[#E5E7DF] text-center text-xs text-stone-500">
            Don&apos;t have an account?{" "}
            <Link to="/register" state={location.state} className="font-bold text-[#173D2A] hover:underline">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
