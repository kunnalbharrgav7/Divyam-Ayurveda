import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, Check, X, Phone } from "lucide-react";
import {
  DEFAULT_COUNTRY,
  getCountryList,
  findCountry,
  countryForDial,
  sanitizeNationalNumber,
} from "../../utils/phone";

/**
 * Country-code picker + mobile number box.
 *
 * value:    { iso, countryCode, number }   (number = national digits, no country code, no spaces)
 * onChange: called with the same shape
 *
 * The country list opens as a bottom drawer on phones and as a dropdown on larger screens.
 */
export const PhoneInput = ({
  id = "mobile-number",
  value,
  onChange,
  disabled = false,
  invalid = false,
  placeholder = "98765 43210",
  autoFocus = false,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);
  const searchRef = useRef(null);

  const selected =
    (value?.iso && findCountry(value.iso)) || countryForDial(value?.countryCode) || findCountry(DEFAULT_COUNTRY.iso);

  const countries = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^\+/, "");
    const list = getCountryList();
    if (!q) return list;
    return list.filter((c) => c.name.toLowerCase().includes(q) || c.iso.toLowerCase() === q || c.dial.slice(1).startsWith(q));
  }, [query]);

  // Close on Escape / outside click; lock page scroll while the bottom drawer is open on a phone
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    const onClick = (e) => {
      if (window.innerWidth >= 640 && wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    const previous = document.body.style.overflow;
    if (window.innerWidth < 640) document.body.style.overflow = "hidden";
    const t = setTimeout(() => searchRef.current?.focus(), 50);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
      document.body.style.overflow = previous;
      clearTimeout(t);
    };
  }, [open]);

  const choose = (country) => {
    onChange({ iso: country.iso, countryCode: country.dial, number: value?.number || "" });
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={wrapRef} className="relative">
      <div
        className={`flex items-stretch rounded-xl border bg-stone-50 focus-within:ring-1 focus-within:ring-[#386B40] ${
          invalid ? "border-rose-400" : "border-[#E5E7DF]"
        } ${disabled ? "opacity-60" : ""}`}
      >
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`Country code ${selected?.dial || ""}, ${selected?.name || ""}. Change country code`}
          className="flex items-center gap-1.5 pl-3 pr-2 py-2.5 border-r border-[#E5E7DF] rounded-l-xl hover:bg-stone-100 cursor-pointer shrink-0"
        >
          <span className="text-[10px] font-bold text-stone-500 bg-white border border-[#E5E7DF] rounded px-1 py-0.5 leading-none">
            {selected?.iso}
          </span>
          <span className="font-semibold text-[#171A17]">{selected?.dial}</span>
          <ChevronDown size={14} className={`text-stone-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        <div className="relative flex-1 min-w-0">
          <input
            id={id}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            autoFocus={autoFocus}
            disabled={disabled}
            value={value?.number || ""}
            onChange={(e) =>
              onChange({ iso: selected?.iso, countryCode: selected?.dial, number: sanitizeNationalNumber(e.target.value) })
            }
            placeholder={placeholder}
            aria-invalid={invalid || undefined}
            className="w-full pl-9 pr-3 py-2.5 bg-transparent rounded-r-xl focus:outline-none"
          />
          <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
        </div>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 sm:hidden" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            role="dialog"
            aria-label="Choose country code"
            className="fixed inset-x-0 bottom-0 z-50 max-h-[75vh] rounded-t-3xl bg-white shadow-2xl border border-[#E5E7DF] flex flex-col sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-0 sm:top-full sm:mt-2 sm:w-80 sm:max-h-80 sm:rounded-2xl"
          >
            <div className="flex items-center justify-between px-4 pt-4 pb-2 sm:hidden">
              <span className="font-bold text-sm text-[#171A17]">Select country code</span>
              <button type="button" onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-stone-100 text-stone-500" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="px-3 pb-2 sm:pt-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search country or code"
                  className="w-full pl-8 pr-3 py-2 bg-stone-50 border border-[#E5E7DF] rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#386B40]"
                />
              </div>
            </div>

            <ul role="listbox" data-lenis-prevent="true" className="overflow-y-auto overscroll-contain pb-3 sm:pb-1">
              {countries.length === 0 && <li className="px-4 py-6 text-center text-stone-400">No country found</li>}
              {countries.map((c) => {
                const active = c.iso === selected?.iso;
                return (
                  <li key={c.iso} role="option" aria-selected={active}>
                    <button
                      type="button"
                      onClick={() => choose(c)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-stone-50 cursor-pointer ${
                        active ? "bg-emerald-50/70" : ""
                      }`}
                    >
                      <span className="text-[10px] font-bold text-stone-500 bg-stone-100 rounded px-1 py-0.5 w-7 text-center shrink-0">
                        {c.iso}
                      </span>
                      <span className="flex-1 min-w-0 truncate text-[#171A17]">{c.name}</span>
                      <span className="text-stone-500 shrink-0">{c.dial}</span>
                      {active && <Check size={14} className="text-[#386B40] shrink-0" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export default PhoneInput;
