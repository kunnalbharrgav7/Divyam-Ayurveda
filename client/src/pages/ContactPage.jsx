import React, { useState } from "react";
import { Mail, Phone, MapPin, Clock, Send, CheckCircle2 } from "lucide-react";
import { Breadcrumbs } from "../components/common/Breadcrumbs";

export const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "Product Inquiry",
    message: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    setError("");
    setSubmitted(true);
  };

  return (
    <div className="bg-[#FBFAF6] min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: "Contact Us" }]} />

        {/* Heading */}
        <div className="text-center max-w-2xl mx-auto py-6 space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#386B40]">
            We&apos;re Here to Help
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[#171A17]">
            Get in Touch with Divyam Ayurveda
          </h1>
          <p className="text-xs sm:text-sm text-[#666B64] leading-relaxed">
            Have a question about classical formulation usage, order tracking, or bulk Ayurvedic inquiries? Reach out to our herbal advisory desk.
          </p>
        </div>

        {/* Grid: Details + Contact Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 my-8 items-start">
          {/* Details (5 cols) */}
          <div className="lg:col-span-5 bg-[#173D2A] text-white rounded-3xl p-6 sm:p-10 space-y-6 shadow-xs">
            <div>
              <h2 className="font-serif text-2xl font-bold">
                Dispensary Information
              </h2>
              <p className="text-xs text-stone-200 mt-1">
                Reach our certified Ayurvedic Vaidyas and customer care team.
              </p>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <MapPin size={18} className="text-[#A9D18E]" />
                </div>
                <div>
                  <h4 className="font-bold text-white">Central Dispensary</h4>
                  <p className="text-stone-300 text-xs mt-0.5 leading-relaxed">
                    Divyam Ayurveda Herbal Kendra, 108 Botanical Garden Road, Indiranagar, Bengaluru, Karnataka 560038
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <Phone size={18} className="text-[#A9D18E]" />
                </div>
                <div>
                  <h4 className="font-bold text-white">Telephone Support</h4>
                  <p className="text-stone-300 text-xs mt-0.5">
                    +91 (080) 4567-8900 / +91 98765 43210
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <Mail size={18} className="text-[#A9D18E]" />
                </div>
                <div>
                  <h4 className="font-bold text-white">Email Inquiries</h4>
                  <p className="text-stone-300 text-xs mt-0.5">
                    care@divyamayurveda.com
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <Clock size={18} className="text-[#A9D18E]" />
                </div>
                <div>
                  <h4 className="font-bold text-white">Advisory Desk Hours</h4>
                  <p className="text-stone-300 text-xs mt-0.5">
                    Monday – Saturday: 9:00 AM – 7:00 PM IST
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Form (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-[#E5E7DF] p-6 sm:p-10 shadow-xs">
            {submitted ? (
              <div className="p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={36} />
                </div>
                <h3 className="font-serif text-2xl font-bold text-[#171A17]">
                  Thank You for Writing to Us!
                </h3>
                <p className="text-xs sm:text-sm text-[#666B64] max-w-md mx-auto leading-relaxed">
                  Your message has been safely logged in our dispensary inbox. One of our Ayurvedic specialists will respond to <strong>{formData.email}</strong> within 24 business hours.
                </p>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setFormData({
                      name: "",
                      email: "",
                      phone: "",
                      subject: "Product Inquiry",
                      message: "",
                    });
                  }}
                  className="px-6 py-2.5 bg-[#173D2A] text-white text-xs font-semibold rounded-xl"
                >
                  Send Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <h3 className="font-serif text-xl font-bold text-[#171A17] mb-2">
                  Send Us an Inquiry
                </h3>

                {error && (
                  <div className="p-3 bg-rose-50 text-rose-700 rounded-xl border border-rose-200">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-[#171A17] mb-1">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Ananya Sen"
                      className="w-full p-2.5 bg-stone-50 border border-[#E5E7DF] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#386B40]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#171A17] mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="name@example.com"
                      className="w-full p-2.5 bg-stone-50 border border-[#E5E7DF] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#386B40]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-[#171A17] mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full p-2.5 bg-stone-50 border border-[#E5E7DF] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#386B40]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#171A17] mb-1">
                      Subject
                    </label>
                    <select
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full p-2.5 bg-stone-50 border border-[#E5E7DF] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#386B40]"
                    >
                      <option value="Product Inquiry">Product Inquiry</option>
                      <option value="Dosha Guidance">Dosha Guidance</option>
                      <option value="Order Tracking">Order &amp; Delivery</option>
                      <option value="Returns & Refunds">Returns &amp; Refunds</option>
                      <option value="Wholesale & Bulk">Wholesale &amp; Bulk</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[#171A17] mb-1">
                    Your Message *
                  </label>
                  <textarea
                    rows={5}
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Tell us what you would like to know about our products or order..."
                    className="w-full p-2.5 bg-stone-50 border border-[#E5E7DF] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#386B40]"
                  />
                </div>

                <button
                  type="submit"
                  className="px-8 py-3 bg-[#173D2A] hover:bg-[#0B2416] text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <span>Submit Message</span>
                  <Send size={14} />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

