import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { User, Mail, Lock, ArrowRight, Loader2, Gift, Eye, EyeOff, Check, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { PhoneInput } from "../components/common/PhoneInput";
import { useReferrals } from "../context/ReferralContext";
import { DEFAULT_COUNTRY, validateMobile } from "../utils/phone";

const inputClass =
  "w-full pl-9 pr-3.5 py-2.5 bg-stone-50 border rounded-xl focus:outline-none focus:ring-1 focus:ring-[#386B40] disabled:opacity-60";

// Same rule the server enforces: 8-128 characters with at least one letter and one number
const passwordProblem = (value) => {
  if (value.length < 8) return "Password must be at least 8 characters.";
  if (value.length > 128) return "Password must be at most 128 characters.";
  if (!/[A-Za-z]/.test(value)) return "Password must contain at least one letter.";
  if (!/\d/.test(value)) return "Password must contain at least one number.";
  return "";
};

export const RegisterPage = () => {
  const { activeAttribution } = useReferrals();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    referralCode: activeAttribution?.code || "",
  });
  const [mobile, setMobile] = useState({ iso: DEFAULT_COUNTRY.iso, countryCode: DEFAULT_COUNTRY.dial, number: "" });
  const [showPasswords, setShowPasswords] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const confirmTouched = formData.confirmPassword.length > 0;
  const passwordsMatch = formData.password === formData.confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const errors = {};
    if (!formData.name.trim()) errors.name = "Please enter your name.";
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(formData.email.trim())) {
      errors.email = "Please enter a valid email address.";
    }
    const phoneCheck = validateMobile(mobile.countryCode, mobile.number);
    if (!phoneCheck.ok) errors.phone = phoneCheck.message;
    const pwProblem = passwordProblem(formData.password);
    if (pwProblem) errors.password = pwProblem;
    if (!formData.confirmPassword) errors.confirmPassword = "Please confirm your password.";
    else if (!passwordsMatch) errors.confirmPassword = "Passwords do not match.";

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError("Please fix the highlighted fields.");
      return;
    }

    setLoading(true);
    try {
      const res = await register({
        name: formData.name.trim(),
        email: formData.email,
        phoneCountryCode: mobile.countryCode,
        phone: mobile.number,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        referralCode: formData.referralCode,
      });
      if (res.success) {
        const redirectPath = location.state?.from || "/account";
        navigate(redirectPath, { replace: true });
      } else {
        setError(res.error || "Failed to create account. Please try again.");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fieldError = (key) =>
    fieldErrors[key] ? <p className="text-[11px] text-rose-600 mt-1">{fieldErrors[key]}</p> : null;
  const border = (key) => (fieldErrors[key] ? "border-rose-400" : "border-[#E5E7DF]");

  return (
    <div className="bg-[#FBFAF6] min-h-screen py-10">
      <div className="max-w-md mx-auto px-4 sm:px-6">
        <Breadcrumbs items={[{ label: "Register" }]} />

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
              Join Divyam Ayurveda
            </h1>
            <p className="text-xs sm:text-sm text-[#666B64] mt-1">
              Begin your journey into traditional wellness and pure Indian botanicals.
            </p>
          </div>

          {location.state?.message && (
            <div className="mb-4 p-3 rounded-xl bg-amber-50 text-amber-900 text-xs border border-amber-200 flex items-center gap-2">
              <Lock size={15} className="text-amber-700 shrink-0" />
              <span>{location.state.message}</span>
            </div>
          )}

          {error && (
            <div role="alert" className="mb-4 p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs" noValidate>
            <div>
              <label htmlFor="reg-name" className="block font-semibold text-[#171A17] mb-1">
                Full Name *
              </label>
              <div className="relative">
                <input
                  id="reg-name"
                  type="text"
                  autoComplete="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Meera Patel"
                  disabled={loading}
                  className={`${inputClass} ${border("name")}`}
                />
                <User size={16} className="absolute left-3 top-3 text-stone-400" />
              </div>
              {fieldError("name")}
            </div>

            <div>
              <label htmlFor="reg-email" className="block font-semibold text-[#171A17] mb-1">
                Email Address *
              </label>
              <div className="relative">
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="name@example.com"
                  disabled={loading}
                  className={`${inputClass} ${border("email")}`}
                />
                <Mail size={16} className="absolute left-3 top-3 text-stone-400" />
              </div>
              {fieldError("email")}
            </div>

            <div>
              <label htmlFor="reg-mobile" className="block font-semibold text-[#171A17] mb-1">
                Mobile Number *
              </label>
              <PhoneInput
                id="reg-mobile"
                value={mobile}
                onChange={setMobile}
                disabled={loading}
                invalid={Boolean(fieldErrors.phone)}
              />
              {fieldError("phone") || (
                <p className="text-[11px] text-stone-400 mt-1">Choose your country code, then type the number without it.</p>
              )}
            </div>

            <div>
              <label htmlFor="reg-password" className="block font-semibold text-[#171A17] mb-1">
                Create Password *
              </label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPasswords ? "text" : "password"}
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="At least 8 characters, with a letter and a number"
                  disabled={loading}
                  className={`${inputClass} pr-10 ${border("password")}`}
                />
                <Lock size={16} className="absolute left-3 top-3 text-stone-400" />
                <button
                  type="button"
                  onClick={() => setShowPasswords((v) => !v)}
                  className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-700 cursor-pointer"
                  aria-label={showPasswords ? "Hide passwords" : "Show passwords"}
                >
                  {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldError("password")}
            </div>

            <div>
              <label htmlFor="reg-confirm" className="block font-semibold text-[#171A17] mb-1">
                Confirm Password *
              </label>
              <div className="relative">
                <input
                  id="reg-confirm"
                  type={showPasswords ? "text" : "password"}
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Type the password again"
                  disabled={loading}
                  className={`${inputClass} ${
                    fieldErrors.confirmPassword || (confirmTouched && !passwordsMatch)
                      ? "border-rose-400"
                      : confirmTouched && passwordsMatch
                        ? "border-emerald-400"
                        : "border-[#E5E7DF]"
                  }`}
                />
                <Lock size={16} className="absolute left-3 top-3 text-stone-400" />
              </div>
              {confirmTouched && (
                <p
                  className={`text-[11px] mt-1 flex items-center gap-1 ${passwordsMatch ? "text-emerald-700" : "text-rose-600"}`}
                  aria-live="polite"
                >
                  {passwordsMatch ? <Check size={12} /> : <X size={12} />}
                  {passwordsMatch ? "Passwords match" : "Passwords do not match"}
                </p>
              )}
              {!confirmTouched && fieldError("confirmPassword")}
            </div>

            <div>
              <label htmlFor="reg-referral" className="block font-semibold text-[#171A17] mb-1">
                Referral Code <span className="font-normal text-stone-400">(optional)</span>
              </label>
              <div className="relative">
                <input
                  id="reg-referral"
                  type="text"
                  value={formData.referralCode}
                  onChange={(e) => setFormData({ ...formData, referralCode: e.target.value.toUpperCase() })}
                  placeholder="Got a code from a friend?"
                  disabled={loading}
                  className={`${inputClass} border-[#E5E7DF] font-mono`}
                />
                <Gift size={16} className="absolute left-3 top-3 text-stone-400" />
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
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-[#E5E7DF] text-center text-xs text-stone-500">
            Already have an account?{" "}
            <Link to="/login" state={location.state} className="font-bold text-[#173D2A] hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
