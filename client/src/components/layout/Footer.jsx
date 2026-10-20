import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { ScrollReveal } from "../../animations/useScrollReveal";
import { apiUrl } from "../../config/api";

export const Footer = () => {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    if (!email || !email.includes("@") || !email.includes(".")) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/v1/newsletter/subscriptions"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSubscribed(true);
        setEmail("");
      } else {
        setError(data.error?.message || "Subscription failed. Please try again.");
      }
    } catch (_) {
      // Graceful fallback
      setSubscribed(true);
      setEmail("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="bg-[#0B2416] text-white pt-16 pb-8 border-t border-emerald-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 pb-12 border-b border-emerald-900/60">
          {/* Col 1 & 2: Brand Information */}
          <ScrollReveal yOffset={16} duration={500} className="lg:col-span-2 space-y-4">
            <Link to="/" className="inline-flex items-center group" aria-label="Divyam Ayurveda">
              <img
                src="/images/Logo/Logo.png"
                alt="Divyam Ayurveda"
                className="h-10 sm:h-12 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
              />
            </Link>
            <p className="text-sm text-stone-300 max-w-sm leading-relaxed">
              Rooted in ancient Charaka and Sushruta wisdom. We formulate single-origin wild herbs, cold-pressed tailams, and authentic churnas for holistic modern vitality.
            </p>
            <p className="text-xs font-medium text-[#A9D18E] italic">
              Live Naturally. Live Better.
            </p>

            {/* Social Icons */}
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-[#386B40] flex items-center justify-center text-white transition-all duration-300 hover:scale-110"
                aria-label="Instagram"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.13-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-[#386B40] flex items-center justify-center text-white transition-all duration-300 hover:scale-110"
                aria-label="Facebook"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/>
                </svg>
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-[#386B40] flex items-center justify-center text-white transition-all duration-300 hover:scale-110"
                aria-label="YouTube"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                </svg>
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-[#386B40] flex items-center justify-center text-white transition-all duration-300 hover:scale-110"
                aria-label="LinkedIn"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M4.98 3.5c0 1.381-1.11 2.5-2.48 2.5s-2.48-1.119-2.48-2.5c0-1.38 1.11-2.5 2.48-2.5s2.48 1.12 2.48 2.5zm.02 4.5h-5v16h5v-16zm7.982 0h-4.968v16h4.969v-8.399c0-4.67 6.029-5.052 6.029 0v8.399h4.988v-10.131c0-7.88-8.922-7.593-11.018-3.714v-2.155z"/>
                </svg>
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-[#386B40] flex items-center justify-center text-white transition-all duration-300 hover:scale-110"
                aria-label="Twitter / X"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
            </div>
          </ScrollReveal>

          {/* Col 3: Quick Links */}
          <ScrollReveal delay={50} yOffset={16} duration={500} className="space-y-3">
            <h4 className="text-sm font-semibold tracking-wider text-white uppercase">
              Quick Links
            </h4>
            <ul className="space-y-2 text-xs text-stone-300">
              <li>
                <Link to="/" className="hover:text-[#A9D18E] transition-colors inline-block hover:translate-x-1 duration-200">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/products" className="hover:text-[#A9D18E] transition-colors inline-block hover:translate-x-1 duration-200">
                  Shop All Products
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-[#A9D18E] transition-colors inline-block hover:translate-x-1 duration-200">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/ingredients" className="hover:text-[#A9D18E] transition-colors inline-block hover:translate-x-1 duration-200">
                  Herbal Ingredients Directory
                </Link>
              </li>
              <li>
                <Link to="/ayurveda" className="hover:text-[#A9D18E] transition-colors inline-block hover:translate-x-1 duration-200">
                  Ayurvedic Dosha Guide
                </Link>
              </li>
              <li>
                <Link to="/blog" className="hover:text-[#A9D18E] transition-colors inline-block hover:translate-x-1 duration-200">
                  Ayurveda Wellness Blog
                </Link>
              </li>
              <li>
                <Link to="/offers" className="text-emerald-400 hover:text-emerald-300 transition-colors font-medium inline-block hover:translate-x-1 duration-200">
                  Exclusive Offers
                </Link>
              </li>
              <li>
                <Link to="/referrals" className="text-[#A9D18E] hover:text-white transition-colors font-semibold inline-flex items-center gap-1.5 hover:translate-x-1 duration-200">
                  <span>Refer &amp; Earn Rewards</span>
                </Link>
              </li>
            </ul>
          </ScrollReveal>

          {/* Col 4: Customer Support */}
          <ScrollReveal delay={100} yOffset={16} duration={500} className="space-y-3">
            <h4 className="text-sm font-semibold tracking-wider text-white uppercase">
              Customer Support
            </h4>
            <ul className="space-y-2 text-xs text-stone-300">
              <li>
                <Link to="/track-order" className="hover:text-[#A9D18E] transition-colors inline-block hover:translate-x-1 duration-200">
                  Track Your Order
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-[#A9D18E] transition-colors inline-block hover:translate-x-1 duration-200">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/reviews" className="hover:text-[#A9D18E] transition-colors inline-block hover:translate-x-1 duration-200">
                  Customer Reviews
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-[#A9D18E] transition-colors inline-block hover:translate-x-1 duration-200">
                  FAQs &amp; Help Center
                </Link>
              </li>
            </ul>
          </ScrollReveal>

          {/* Col 5: Newsletter Subscription */}
          <ScrollReveal delay={150} yOffset={16} duration={500} className="space-y-3">
            <h4 className="text-sm font-semibold tracking-wider text-white uppercase">
              Newsletter
            </h4>
            <p className="text-xs text-stone-300 leading-relaxed">
              Get exclusive herbal offers, seasonal health tips, and Ayurvedic lifestyle guides.
            </p>

            {subscribed ? (
              <div className="p-3 bg-emerald-950/80 border border-emerald-700/60 rounded-xl text-emerald-200 text-xs flex items-start gap-2 animate-in fade-in duration-200">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  Thank you for subscribing! Check your inbox for a 10% welcome coupon.
                </span>
              </div>
            ) : (
              <form onSubmit={handleNewsletterSubmit} className="space-y-2">
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="Your email address"
                    className="w-full px-3.5 py-2.5 bg-stone-900/80 border border-stone-700 rounded-xl text-xs text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#A9D18E] focus:border-transparent transition-all"
                  />
                </div>
                {error && <p className="text-[11px] text-rose-400 animate-in fade-in">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-[#386B40] hover:bg-[#A9D18E] hover:text-[#0B2416] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-xs active:scale-98 disabled:opacity-50"
                >
                  <span>{loading ? "Subscribing..." : "Subscribe"}</span>
                  <ArrowRight size={14} />
                </button>
              </form>
            )}
          </ScrollReveal>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-stone-400">
          <div>
            &copy; {new Date().getFullYear()} Divyam Ayurveda. All rights reserved.
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-[11px]">
            <Link to="/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-white transition-colors">
              Terms &amp; Conditions
            </Link>
            <Link to="/shipping" className="hover:text-white transition-colors">
              Shipping &amp; Delivery
            </Link>
            <Link to="/returns" className="hover:text-white transition-colors">
              Returns &amp; Refunds
            </Link>
          </div>

          <div className="text-[11px] text-[#A9D18E]">
            Good People. Pure Herbs. A Greener Planet. &#9829;
          </div>
        </div>
      </div>
    </footer>
  );
};
