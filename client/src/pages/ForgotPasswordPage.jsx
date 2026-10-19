import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Leaf, Mail, ArrowRight, CheckCircle2 } from "lucide-react";
import { Breadcrumbs } from "../components/common/Breadcrumbs";

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email && email.includes("@")) {
      setSent(true);
    }
  };

  return (
    <div className="bg-[#FBFAF6] min-h-screen py-10">
      <div className="max-w-md mx-auto px-4 sm:px-6">
        <Breadcrumbs items={[{ label: "Forgot Password" }]} />

        <div className="bg-white rounded-3xl border border-[#E5E7DF] p-6 sm:p-8 shadow-xs mt-4">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-[#173D2A] text-[#A9D18E] flex items-center justify-center mx-auto mb-3 shadow-xs">
              <Leaf size={24} />
            </div>
            <h1 className="font-heading tracking-tight text-2xl sm:text-3xl font-bold text-[#171A17]">
              Reset Password
            </h1>
            <p className="text-xs sm:text-sm text-[#666B64] mt-1">
              Enter your registered email to receive simulated password recovery instructions.
            </p>
          </div>

          {sent ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3">
              <CheckCircle2 size={32} className="text-emerald-600 mx-auto" />
              <h3 className="font-semibold text-emerald-900 text-sm">
                Password Reset Link Sent!
              </h3>
              <p className="text-xs text-emerald-800 leading-relaxed">
                In this demo environment, a password reset link has been dispatched to{" "}
                <strong>{email}</strong>.
              </p>
              <Link
                to="/login"
                className="inline-block mt-2 px-5 py-2 bg-[#173D2A] text-white text-xs font-semibold rounded-xl"
              >
                Return to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#171A17] mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-stone-50 border border-[#E5E7DF] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#386B40]"
                  />
                  <Mail size={16} className="absolute left-3 top-3 text-stone-400" />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 bg-[#173D2A] hover:bg-[#0B2416] text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs"
              >
                <span>Send Reset Link</span>
                <ArrowRight size={15} />
              </button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-[#E5E7DF] text-center text-xs text-stone-500">
            Remembered your password?{" "}
            <Link to="/login" className="font-bold text-[#173D2A] hover:underline">
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

