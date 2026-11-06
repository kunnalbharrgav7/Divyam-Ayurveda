import React from "react";
import { Send, AlertTriangle } from "lucide-react";
import { formatDateTime } from "../../../utils/formatters";

/** A read-only conversation: `entries` are { key, who, fromCustomer, text, time } */
export const Thread = ({ entries }) => (
  <ol className="space-y-3 max-h-72 overflow-y-auto pr-1" aria-label="Conversation">
    {entries.map((e) => (
      <li key={e.key} className={`flex ${e.fromCustomer ? "justify-start" : "justify-end"}`}>
        <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${e.fromCustomer ? "bg-stone-100 text-stone-800" : "bg-[#173D2A] text-white"}`}>
          <div className={`text-[10px] font-semibold mb-0.5 ${e.fromCustomer ? "text-stone-500" : "text-[#A9D18E]"}`}>
            {e.who} · {formatDateTime(e.time)}
          </div>
          <p className="whitespace-pre-wrap break-words">{e.text}</p>
        </div>
      </li>
    ))}
  </ol>
);

/** The reply box under a conversation */
export const ReplyBox = ({ id, value, onChange, onSend, sending, error, label = "Your reply", help, disabled }) => (
  <form onSubmit={onSend} noValidate className="space-y-2">
    {error && (
      <div role="alert" className="p-2.5 rounded-xl border bg-rose-50 border-rose-200 text-rose-800 text-xs flex items-start gap-2">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> <span>{error}</span>
      </div>
    )}
    <label htmlFor={id} className="block text-xs font-semibold text-stone-700">{label}</label>
    <textarea
      id={id}
      rows={4}
      maxLength={2000}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled || sending}
      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#173D2A] focus:border-[#173D2A] disabled:bg-stone-50"
    />
    {help && <p className="text-[11px] text-stone-500">{help}</p>}
    <button
      type="submit"
      disabled={disabled || sending || !value.trim()}
      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#173D2A] text-white hover:bg-[#0B2416] rounded-xl shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Send className="w-3.5 h-3.5" />
      {sending ? "Saving..." : "Save reply"}
    </button>
  </form>
);
