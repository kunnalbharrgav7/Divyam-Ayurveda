import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Mail, Phone, Lock, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Breadcrumbs } from "../components/common/Breadcrumbs";

export const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [error, setError] = useState("");
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!formData.email || !formData.email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!formData.password || formData.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    register(formData);
    navigate("/account");
  };

  return (
    <div className="bg-[#FBFAF6] min-h-screen py-10">
      <div className="max-w-md mx-auto px-4 sm:px-6">
        <Breadcrumbs items={[{ label: "Register" }]} />

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
              Join Divyam Ayurveda
            </h1>
            <p className="text-xs sm:text-sm text-[#666B64] mt-1">
              Begin your journey into traditional wellness and pure Indian botanicals.
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
                Full Name *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Meera Patel"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-stone-50 border border-[#E5E7DF] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#386B40]"
                />
                <User size={16} className="absolute left-3 top-3 text-stone-400" />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#171A17] mb-1">
                Email Address *
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-stone-50 border border-[#E5E7DF] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#386B40]"
                />
                <Mail size={16} className="absolute left-3 top-3 text-stone-400" />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#171A17] mb-1">
                Mobile Number
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-stone-50 border border-[#E5E7DF] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#386B40]"
                />
                <Phone size={16} className="absolute left-3 top-3 text-stone-400" />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#171A17] mb-1">
                Create Password *
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="At least 6 characters"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-stone-50 border border-[#E5E7DF] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#386B40]"
                />
                <Lock size={16} className="absolute left-3 top-3 text-stone-400" />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-[#173D2A] hover:bg-[#0B2416] text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs"
            >
              <span>Create Account</span>
              <ArrowRight size={15} />
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-[#E5E7DF] text-center text-xs text-stone-500">
            Already have an account?{" "}
            <Link to="/login" className="font-bold text-[#173D2A] hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
