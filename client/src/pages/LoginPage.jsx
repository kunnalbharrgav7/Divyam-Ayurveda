import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, Mail, ArrowRight, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Breadcrumbs } from "../components/common/Breadcrumbs";

export const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!password || password.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }

    login(email, password);
    navigate("/account");
  };

  const handleDemoCustomerLogin = () => {
    login("aarav.sharma@example.com", "ayurveda123");
    navigate("/account");
  };

  const { loginAsAdmin } = useAuth();
  const handleDemoAdminLogin = () => {
    loginAsAdmin();
    navigate("/admin/dashboard");
  };

  return (
    <div className="bg-[#FBFAF6] min-h-screen py-10">
      <div className="max-w-md mx-auto px-4 sm:px-6">
        <Breadcrumbs items={[{ label: "Login" }]} />

        <div className="bg-white rounded-3xl border border-[#E5E7DF] p-6 sm:p-8 shadow-xs mt-4">
          <div className="text-center mb-6">
            <Link to="/" className="inline-block mb-3 hover:opacity-90 transition-opacity" aria-label="Divyam Ayurveda">
              <img
                src="/images/Logo/Logo.png"
                alt="Divyam Ayurveda"
                className="h-14 sm:h-16 w-auto mx-auto object-contain"
              />
            </Link>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#171A17]">
              Sign In
            </h1>
            <p className="text-xs sm:text-sm text-[#666B64] mt-1">
              Sign in to manage your Ayurvedic orders or access store administration.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-[#171A17] mb-1">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-stone-50 border border-[#E5E7DF] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#386B40]"
                />
                <Mail size={16} className="absolute left-3 top-3 text-stone-400" />
              </div>
            </div>

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
                  className="w-full pl-9 pr-3.5 py-2.5 bg-stone-50 border border-[#E5E7DF] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#386B40]"
                />
                <Lock size={16} className="absolute left-3 top-3 text-stone-400" />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-[#173D2A] hover:bg-[#0B2416] text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs"
            >
              <span>Sign In</span>
              <ArrowRight size={15} />
            </button>

            {/* Demo Login Options */}
            <div className="pt-2 space-y-2 border-t border-[#E5E7DF]">
              <span className="block text-[11px] font-bold text-center text-stone-400 uppercase tracking-wider">
                Instant Demo Access
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleDemoCustomerLogin}
                  className="py-2.5 px-3 bg-[#F4F4EE] hover:bg-stone-200 text-[#173D2A] font-semibold rounded-xl transition-colors text-xs text-center border border-stone-200/80"
                >
                  👤 Customer Demo (Aarav)
                </button>
                <button
                  type="button"
                  onClick={handleDemoAdminLogin}
                  className="py-2.5 px-3 bg-[#386B40] hover:bg-[#173D2A] text-white font-semibold rounded-xl transition-colors text-xs text-center shadow-xs"
                >
                  ⚡ Admin Demo (Super Admin)
                </button>
              </div>
            </div>
          </form>

          <div className="mt-6 pt-4 border-t border-[#E5E7DF] text-center text-xs text-stone-500">
            Don&apos;t have an account?{" "}
            <Link to="/register" className="font-bold text-[#173D2A] hover:underline">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
