import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LifeBuoy, Plus, ArrowLeft, Send, Loader2, MessageSquare, AlertTriangle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { formatDateTime } from "../../utils/formatters";

const CATEGORIES = ["Order Issue", "Delivery", "Payment", "Product Question", "Returns & Refunds", "Other"];

const STATUS_STYLE = {
  Open: "bg-amber-100 text-amber-800",
  "In Progress": "bg-blue-100 text-blue-800",
  Resolved: "bg-emerald-100 text-emerald-800",
  Closed: "bg-stone-100 text-stone-600",
};
const STATUS_HELP = {
  Open: "We've received it and will reply soon.",
  "In Progress": "Our team is looking into it.",
  Resolved: "Marked as resolved. Reply below if you still need help and we'll reopen it.",
  Closed: "This ticket is closed. Please open a new ticket if you need more help.",
};

const inputClass = "w-full p-2.5 bg-stone-50 border border-[#E5E7DF] rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#386B40]";

const readError = async (res, fallback) => {
  const json = await res.json().catch(() => null);
  return json?.error?.details?.[0]?.message || json?.error?.message || fallback;
};

export const MySupportPanel = ({ orders = [] }) => {
  const { authFetch } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const presetOrder = new URLSearchParams(location.search).get("order") || "";

  const [tickets, setTickets] = useState([]);
  const [messages, setMessages] = useState([]); // Contact Us messages sent while signed in
  const [openMessageId, setOpenMessageId] = useState(null);
  const [loadState, setLoadState] = useState("loading"); // loading | ready | error
  const [view, setView] = useState(presetOrder ? "new" : "list"); // list | new | detail
  const [activeNumber, setActiveNumber] = useState(null);

  const [form, setForm] = useState({ subject: "", category: presetOrder ? "Order Issue" : "Other", orderNumber: presetOrder, message: "" });
  const [creating, setCreating] = useState(false);
  const creatingRef = useRef(false);
  const [formError, setFormError] = useState("");

  const [reply, setReply] = useState("");
  const [replying, setReplying] = useState(false);
  const replyingRef = useRef(false);
  const [replyError, setReplyError] = useState("");

  const load = useCallback(async () => {
    try {
      const [res, msgRes] = await Promise.all([authFetch("/api/v1/me/tickets"), authFetch("/api/v1/me/enquiries")]);
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error("bad response");
      setTickets(json.data);
      // The messages list is a bonus: if it fails the tickets still show
      const msgJson = msgRes.ok ? await msgRes.json().catch(() => null) : null;
      setMessages(msgJson?.success ? msgJson.data : []);
      setLoadState("ready");
    } catch {
      setLoadState("error");
    }
    // authFetch changes identity on every render of the provider; load on mount and after our own changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const active = tickets.find((t) => t.ticketNumber === activeNumber) || null;

  const submitTicket = async (e) => {
    e.preventDefault();
    if (creatingRef.current) return;
    if (form.subject.trim().length < 5) return setFormError("Give your ticket a short subject (at least 5 characters).");
    if (form.message.trim().length < 10) return setFormError("Please describe the problem (at least 10 characters).");
    setFormError("");
    creatingRef.current = true;
    setCreating(true);
    try {
      const res = await authFetch("/api/v1/me/tickets", {
        method: "POST",
        body: JSON.stringify({ subject: form.subject.trim(), category: form.category, orderNumber: form.orderNumber, message: form.message.trim() }),
      });
      if (!res.ok) {
        setFormError(await readError(res, "We couldn't create your ticket. Please try again."));
        return;
      }
      const json = await res.json();
      setTickets((prev) => [json.data, ...prev]);
      setForm({ subject: "", category: "Other", orderNumber: "", message: "" });
      setActiveNumber(json.data.ticketNumber);
      setView("detail");
      navigate("/account/support", { replace: true }); // drop ?order= so refreshing does not reopen the form
    } catch {
      setFormError("We couldn't reach the server. Please check your connection and try again.");
    } finally {
      creatingRef.current = false;
      setCreating(false);
    }
  };

  const sendReply = async (e) => {
    e.preventDefault();
    if (replyingRef.current || !active) return;
    if (reply.trim().length < 2) return setReplyError("Write your message first.");
    setReplyError("");
    replyingRef.current = true;
    setReplying(true);
    try {
      const res = await authFetch(`/api/v1/me/tickets/${encodeURIComponent(active.ticketNumber)}/messages`, {
        method: "POST",
        body: JSON.stringify({ message: reply.trim() }),
      });
      if (!res.ok) {
        setReplyError(await readError(res, "Your message could not be sent. Please try again."));
        return;
      }
      const json = await res.json();
      setTickets((prev) => prev.map((t) => (t.ticketNumber === json.data.ticketNumber ? json.data : t)));
      setReply("");
    } catch {
      setReplyError("We couldn't reach the server. Please check your connection and try again.");
    } finally {
      replyingRef.current = false;
      setReplying(false);
    }
  };

  // ---------------------------------------------------------------- views
  if (view === "new") {
    return (
      <div className="space-y-5">
        <button type="button" onClick={() => setView("list")} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#386B40] hover:underline">
          <ArrowLeft size={14} /> Back to my tickets
        </button>
        <div>
          <h2 className="font-heading tracking-tight text-xl font-bold text-[#171A17]">Raise a support ticket</h2>
          <p className="text-xs text-[#666B64] mt-1">Tell us what went wrong. Our team replies here, and you can follow the conversation any time.</p>
        </div>
        <form onSubmit={submitTicket} noValidate className="space-y-4 text-xs">
          {formError && (
            <div role="alert" className="p-3 bg-rose-50 text-rose-700 rounded-xl border border-rose-200 flex items-start gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" /> <span>{formError}</span>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="tk-category" className="block font-semibold text-[#171A17] mb-1">What is it about?</label>
              <select id="tk-category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="tk-order" className="block font-semibold text-[#171A17] mb-1">Related order <span className="font-normal text-stone-400">(optional)</span></label>
              <select id="tk-order" value={form.orderNumber} onChange={(e) => setForm({ ...form, orderNumber: e.target.value })} className={inputClass}>
                <option value="">Not about a specific order</option>
                {orders.map((o) => {
                  const number = o.orderNumber || o.id;
                  return <option key={number} value={number}>{number}</option>;
                })}
                {presetOrder && !orders.some((o) => (o.orderNumber || o.id) === presetOrder) && <option value={presetOrder}>{presetOrder}</option>}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="tk-subject" className="block font-semibold text-[#171A17] mb-1">Subject *</label>
            <input id="tk-subject" type="text" maxLength={150} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="e.g. My parcel has not arrived" className={inputClass} />
          </div>
          <div>
            <label htmlFor="tk-message" className="block font-semibold text-[#171A17] mb-1">Describe the problem *</label>
            <textarea id="tk-message" rows={5} maxLength={2000} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className={inputClass} />
          </div>
          <button type="submit" disabled={creating} className="px-6 py-2.5 bg-[#173D2A] hover:bg-[#0B2416] text-white font-semibold rounded-xl inline-flex items-center gap-2 disabled:opacity-60">
            {creating ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} {creating ? "Sending..." : "Send ticket"}
          </button>
        </form>
      </div>
    );
  }

  if (view === "detail" && active) {
    const canWrite = active.status !== "Closed";
    return (
      <div className="space-y-5">
        <button type="button" onClick={() => setView("list")} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#386B40] hover:underline">
          <ArrowLeft size={14} /> Back to my tickets
        </button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-mono text-[11px] text-stone-500">{active.ticketNumber}</div>
            <h2 className="font-heading tracking-tight text-xl font-bold text-[#171A17] break-words">{active.subject}</h2>
            <div className="text-[11px] text-stone-500 mt-0.5">
              {active.category}
              {active.orderNumber ? ` · Order ${active.orderNumber}` : ""} · Opened {formatDateTime(active.createdAt)}
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLE[active.status] || "bg-stone-100 text-stone-700"}`}>{active.status}</span>
        </div>
        <p className="text-xs text-[#666B64]">{STATUS_HELP[active.status]}</p>

        <ol className="space-y-3" aria-label="Conversation">
          {active.messages.map((m, i) => {
            const mine = m.senderRole === "customer";
            return (
              <li key={i} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${mine ? "bg-[#173D2A] text-white" : "bg-stone-100 text-stone-800"}`}>
                  <div className={`text-[10px] font-semibold mb-1 ${mine ? "text-[#A9D18E]" : "text-[#386B40]"}`}>
                    {mine ? "You" : `${m.sender || "Support team"} (Divyam Ayurveda)`} · {formatDateTime(m.time)}
                  </div>
                  <p className="whitespace-pre-wrap break-words">{m.message}</p>
                </div>
              </li>
            );
          })}
        </ol>

        {canWrite && (
          <form onSubmit={sendReply} noValidate className="space-y-2 text-xs">
            {replyError && <div role="alert" className="p-2.5 bg-rose-50 text-rose-700 rounded-xl border border-rose-200">{replyError}</div>}
            <label htmlFor="tk-reply" className="block font-semibold text-[#171A17]">Add a message</label>
            <textarea id="tk-reply" rows={3} maxLength={2000} value={reply} onChange={(e) => setReply(e.target.value)} className={inputClass} />
            <button type="submit" disabled={replying} className="px-5 py-2 bg-[#173D2A] hover:bg-[#0B2416] text-white font-semibold rounded-xl inline-flex items-center gap-2 disabled:opacity-60">
              {replying ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} {replying ? "Sending..." : "Send"}
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading tracking-tight text-xl font-bold text-[#171A17]">Help &amp; Support</h2>
          <p className="text-xs text-[#666B64] mt-1">Your support tickets and our replies.</p>
        </div>
        <button type="button" onClick={() => setView("new")} className="px-4 py-2 bg-[#173D2A] hover:bg-[#0B2416] text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5">
          <Plus size={14} /> Raise a ticket
        </button>
      </div>

      {loadState === "loading" && <div role="status" className="flex items-center gap-2 text-xs text-stone-500 p-4"><Loader2 size={14} className="animate-spin" /> Loading your tickets…</div>}

      {loadState === "error" && (
        <div role="alert" className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-center justify-between gap-3">
          <span>We couldn't load your tickets.</span>
          <button type="button" onClick={() => { setLoadState("loading"); load(); }} className="font-semibold underline">Try again</button>
        </div>
      )}

      {loadState === "ready" && tickets.length === 0 && messages.length === 0 && (
        <div className="text-center py-12 space-y-2">
          <LifeBuoy className="w-10 h-10 mx-auto text-stone-300" />
          <p className="text-sm font-semibold text-stone-700">Nothing here yet</p>
          <p className="text-xs text-[#666B64]">If something is wrong with an order, raise a ticket and we'll help. Messages you send from the Contact Us page while signed in appear here with our replies.</p>
        </div>
      )}

      {loadState === "ready" && tickets.length > 0 && (
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 pt-1">Support tickets</h3>
      )}

      {loadState === "ready" && tickets.length > 0 && (
        <ul className="divide-y divide-[#E5E7DF] border border-[#E5E7DF] rounded-2xl overflow-hidden">
          {tickets.map((t) => {
            const last = t.messages[t.messages.length - 1];
            const waitingOnYou = last && last.senderRole === "staff" && t.status !== "Closed";
            return (
              <li key={t.ticketNumber}>
                <button type="button" onClick={() => { setActiveNumber(t.ticketNumber); setView("detail"); }} className="w-full text-left p-4 hover:bg-stone-50 flex items-start gap-3">
                  <MessageSquare size={16} className="text-[#386B40] shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-xs text-[#171A17] truncate">{t.subject}</span>
                      {waitingOnYou && <span className="px-1.5 py-0.5 rounded-full bg-[#173D2A] text-[#E8D9B5] text-[10px] font-bold">New reply</span>}
                    </div>
                    <div className="text-[11px] text-stone-500 mt-0.5">
                      <span className="font-mono">{t.ticketNumber}</span> · {t.category} · Updated {formatDateTime(t.updatedAt)}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${STATUS_STYLE[t.status] || "bg-stone-100 text-stone-700"}`}>{t.status}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {loadState === "ready" && messages.length > 0 && (
        <div className="space-y-2 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">Messages you sent via Contact Us</h3>
          <ul className="divide-y divide-[#E5E7DF] border border-[#E5E7DF] rounded-2xl overflow-hidden">
            {messages.map((m) => {
              const isOpen = openMessageId === m.id;
              const replied = m.replies.length > 0;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setOpenMessageId(isOpen ? null : m.id)}
                    aria-expanded={isOpen}
                    className="w-full text-left p-4 hover:bg-stone-50 flex items-start gap-3"
                  >
                    <MessageSquare size={16} className="text-[#386B40] shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-xs text-[#171A17] truncate">{m.subject}</span>
                        {replied && <span className="px-1.5 py-0.5 rounded-full bg-[#173D2A] text-[#E8D9B5] text-[10px] font-bold">{m.replies.length === 1 ? "Reply received" : `${m.replies.length} replies`}</span>}
                      </div>
                      <div className="text-[11px] text-stone-500 mt-0.5">Sent {formatDateTime(m.createdAt)}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${replied ? "bg-indigo-100 text-indigo-800" : "bg-amber-100 text-amber-800"}`}>
                      {replied ? "Answered" : "Awaiting reply"}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 space-y-3">
                      <div className="flex justify-end">
                        <div className="max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed bg-[#173D2A] text-white">
                          <div className="text-[10px] font-semibold mb-1 text-[#A9D18E]">You · {formatDateTime(m.createdAt)}</div>
                          <p className="whitespace-pre-wrap break-words">{m.message}</p>
                        </div>
                      </div>
                      {m.replies.map((r, i) => (
                        <div key={i} className="flex justify-start">
                          <div className="max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed bg-stone-100 text-stone-800">
                            <div className="text-[10px] font-semibold mb-1 text-[#386B40]">{r.staffName || "Support team"} (Divyam Ayurveda) · {formatDateTime(r.time)}</div>
                            <p className="whitespace-pre-wrap break-words">{r.message}</p>
                          </div>
                        </div>
                      ))}
                      {!replied && <p className="text-[11px] text-stone-500">We usually reply within 24 business hours. If you need to follow up, raise a support ticket.</p>}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};
