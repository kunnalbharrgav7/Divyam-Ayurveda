import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAdminRefreshSignal } from "../../hooks/useAdminRefreshSignal";
import {
  Save,
  Check,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { AdminCard } from "../../components/admin/common/AdminCard";
import { AdminLoadError } from "../../components/admin/common/AdminLoadError";
import { ConfirmDialog } from "../../components/admin/common/AdminModal";
import { DetailPageSkeleton } from "../../components/common/Skeleton";
import { invalidateCache } from "../../services/requestCache";

// The four footer policy pages plus the FAQ list. Their text is stored in the database and served to the storefront.
const POLICY_TABS = [
  { id: "privacy", label: "Privacy Policy", href: "/privacy" },
  { id: "terms", label: "Terms & Conditions", href: "/terms" },
  { id: "shipping", label: "Shipping & Delivery", href: "/shipping" },
  { id: "returns", label: "Returns & Refunds", href: "/returns" },
];
const TABS = [...POLICY_TABS, { id: "faqs", label: "FAQs", href: "/faq" }];

const inputClass =
  "w-full px-3.5 py-2.5 text-sm bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#173D2A] focus:border-[#173D2A]";
const labelClass = "block text-xs font-semibold text-stone-700 mb-1.5";
const iconButton =
  "p-2 rounded-lg border border-stone-200 text-stone-500 hover:text-stone-900 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors";

// The parts of a page that the editor changes (used to detect unsaved edits)
const editable = (page) => ({
  title: page.title || "",
  eyebrow: page.eyebrow || "",
  updatedLabel: page.updatedLabel || "",
  sections: (page.sections || []).map((s) => ({
    heading: s.heading || "",
    body: s.body || "",
    cards: (s.cards || []).map((c) => ({
      title: c.title || "",
      text: c.text || "",
    })),
  })),
});

const readError = async (res, fallback) => {
  try {
    const json = await res.json();
    return (
      json?.error?.details?.[0]?.message || json?.error?.message || fallback
    );
  } catch {
    return fallback;
  }
};

/* ------------------------------------------------------------------ policy pages */

const PolicyEditor = ({ page, onChange }) => {
  const setSection = (index, patch) =>
    onChange({
      ...page,
      sections: page.sections.map((s, i) =>
        i === index ? { ...s, ...patch } : s,
      ),
    });
  const moveSection = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= page.sections.length) return;
    const next = [...page.sections];
    [next[index], next[target]] = [next[target], next[index]];
    onChange({ ...page, sections: next });
  };
  const removeSection = (index) =>
    onChange({
      ...page,
      sections: page.sections.filter((_, i) => i !== index),
    });
  const addSection = () =>
    onChange({
      ...page,
      sections: [
        ...page.sections,
        {
          heading: `${page.sections.length + 1}. New section`,
          body: "",
          cards: [],
        },
      ],
    });
  const setCard = (sIndex, cIndex, patch) =>
    setSection(sIndex, {
      cards: page.sections[sIndex].cards.map((c, i) =>
        i === cIndex ? { ...c, ...patch } : c,
      ),
    });

  return (
    <div className="space-y-6">
      <AdminCard title="Page header" subtitle="Shown at the top of the page">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Small label above the title</label>
            <input
              className={inputClass}
              value={page.eyebrow}
              onChange={(e) => onChange({ ...page, eyebrow: e.target.value })}
              placeholder="e.g. Data Protection & Integrity"
            />
          </div>
          <div>
            <label className={labelClass}>Page title</label>
            <input
              className={inputClass}
              value={page.title}
              onChange={(e) => onChange({ ...page, title: e.target.value })}
              placeholder="e.g. Privacy Policy"
            />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>"Last updated" line</label>
            <input
              className={inputClass}
              value={page.updatedLabel}
              onChange={(e) =>
                onChange({ ...page, updatedLabel: e.target.value })
              }
              placeholder="e.g. Last updated: January 2026"
            />
          </div>
        </div>
      </AdminCard>

      {page.sections.map((section, index) => (
        <AdminCard
          key={index}
          title={`Section ${index + 1}`}
          action={
            <>
              <button
                type="button"
                className={iconButton}
                onClick={() => moveSection(index, -1)}
                disabled={index === 0}
                aria-label="Move section up"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <button
                type="button"
                className={iconButton}
                onClick={() => moveSection(index, 1)}
                disabled={index === page.sections.length - 1}
                aria-label="Move section down"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
              <button
                type="button"
                className={`${iconButton} hover:text-rose-600`}
                onClick={() => removeSection(index)}
                aria-label="Delete section"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Heading</label>
              <input
                className={inputClass}
                value={section.heading}
                onChange={(e) => setSection(index, { heading: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Text</label>
              <textarea
                rows={5}
                className={`${inputClass} resize-y`}
                value={section.body}
                onChange={(e) => setSection(index, { body: e.target.value })}
              />
              <p className="text-[11px] text-stone-400 mt-1">
                Leave a blank line for a new paragraph. Wrap words in **double
                asterisks** to make them bold. Start lines with "- " for a
                list-style line.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={`${labelClass} mb-0`}>
                  Info cards (optional)
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setSection(index, {
                      cards: [...section.cards, { title: "", text: "" }],
                    })
                  }
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#173D2A] hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" /> Add card
                </button>
              </div>
              {section.cards.map((card, cIndex) => (
                <div
                  key={cIndex}
                  className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-3 items-start p-3 rounded-xl bg-stone-50 border border-stone-100"
                >
                  <input
                    className={inputClass}
                    placeholder="Card title"
                    value={card.title}
                    onChange={(e) =>
                      setCard(index, cIndex, { title: e.target.value })
                    }
                  />
                  <textarea
                    rows={2}
                    className={`${inputClass} resize-y`}
                    placeholder="Card text"
                    value={card.text}
                    onChange={(e) =>
                      setCard(index, cIndex, { text: e.target.value })
                    }
                  />
                  <button
                    type="button"
                    className={`${iconButton} hover:text-rose-600`}
                    onClick={() =>
                      setSection(index, {
                        cards: section.cards.filter((_, i) => i !== cIndex),
                      })
                    }
                    aria-label="Delete card"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </AdminCard>
      ))}

      <button
        type="button"
        onClick={addSection}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-dashed border-stone-300 text-stone-700 hover:border-[#173D2A] hover:text-[#173D2A] text-xs font-semibold transition-colors"
      >
        <Plus className="w-4 h-4" /> Add section
      </button>
    </div>
  );
};

/* ------------------------------------------------------------------ FAQs */

const FaqRow = ({ faq, categories, onSave, onDelete }) => {
  const [draft, setDraft] = useState(faq);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const dirty = ["question", "answer", "category", "isActive"].some(
    (k) => draft[k] !== faq[k],
  );

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await onSave(faq.id, {
        question: draft.question,
        answer: draft.answer,
        category: draft.category,
        isActive: draft.isActive,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`p-4 rounded-xl border space-y-3 ${draft.isActive ? "border-stone-200 bg-white" : "border-stone-200 bg-stone-50/70"}`}
    >
      <div>
        <label className={labelClass}>Question</label>
        <input
          className={inputClass}
          value={draft.question}
          onChange={(e) => setDraft({ ...draft, question: e.target.value })}
        />
      </div>
      <div>
        <label className={labelClass}>Answer</label>
        <textarea
          rows={3}
          className={`${inputClass} resize-y`}
          value={draft.answer}
          onChange={(e) => setDraft({ ...draft, answer: e.target.value })}
        />
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[180px]">
          <label className={labelClass}>Category</label>
          <input
            className={inputClass}
            list="faq-categories"
            value={draft.category}
            onChange={(e) => setDraft({ ...draft, category: e.target.value })}
          />
        </div>
        <button
          type="button"
          onClick={() => setDraft({ ...draft, isActive: !draft.isActive })}
          className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50"
          title={
            draft.isActive
              ? "Visible on the FAQ page"
              : "Hidden from the FAQ page"
          }
        >
          {draft.isActive ? (
            <Eye className="w-4 h-4 text-emerald-700" />
          ) : (
            <EyeOff className="w-4 h-4 text-stone-400" />
          )}
          {draft.isActive ? "Visible" : "Hidden"}
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#173D2A] text-white hover:bg-[#0B2416] text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => onDelete(faq)}
          className={`${iconButton} hover:text-rose-600`}
          aria-label="Delete FAQ"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      {error && <p className="text-xs text-rose-700">{error}</p>}
      <datalist id="faq-categories">
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </div>
  );
};

const FaqEditor = ({ authFetch, notify }) => {
  const [faqs, setFaqs] = useState(null);
  const [error, setError] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [fresh, setFresh] = useState({
    question: "",
    answer: "",
    category: "General",
  });

  const load = useCallback(async () => {
    setError(false);
    try {
      const res = await authFetch("/api/v1/admin/faqs");
      const json = await res.json();
      if (!res.ok || !Array.isArray(json.data)) throw new Error("bad response");
      setFaqs(json.data);
    } catch {
      setError(true);
    }
  }, [authFetch]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Header Refresh button: reload the FAQ list
  const refreshTick = useAdminRefreshSignal();
  useEffect(() => {
    if (refreshTick > 0) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTick]);

  const categories = useMemo(
    () => [...new Set((faqs || []).map((f) => f.category).filter(Boolean))],
    [faqs],
  );

  const save = async (id, fields) => {
    const res = await authFetch(`/api/v1/admin/faqs/${id}`, {
      method: "PATCH",
      body: JSON.stringify(fields),
    });
    if (!res.ok)
      throw new Error(await readError(res, "Could not save this FAQ."));
    const { data } = await res.json();
    setFaqs((prev) => prev.map((f) => (f.id === id ? data : f)));
    invalidateCache("faqs");
    notify("FAQ saved. The storefront shows it right away.");
  };

  const remove = async () => {
    const faq = toDelete;
    setToDelete(null);
    const res = await authFetch(`/api/v1/admin/faqs/${faq.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      notify(await readError(res, "Could not delete this FAQ."), true);
      return;
    }
    setFaqs((prev) => prev.filter((f) => f.id !== faq.id));
    invalidateCache("faqs");
    notify("FAQ deleted.");
  };

  const add = async () => {
    setAddError("");
    if (!fresh.question.trim() || !fresh.answer.trim()) {
      setAddError("Write both a question and an answer.");
      return;
    }
    setAdding(true);
    try {
      const res = await authFetch("/api/v1/admin/faqs", {
        method: "POST",
        body: JSON.stringify(fresh),
      });
      if (!res.ok)
        throw new Error(await readError(res, "Could not add this FAQ."));
      const { data } = await res.json();
      setFaqs((prev) => [...prev, data]);
      invalidateCache("faqs");
      setFresh({ question: "", answer: "", category: fresh.category });
      notify("FAQ added. The storefront shows it right away.");
    } catch (err) {
      setAddError(err.message);
    } finally {
      setAdding(false);
    }
  };

  if (error) return <AdminLoadError what="the FAQs" onRetry={load} />;
  if (!faqs) return <DetailPageSkeleton label="Loading FAQs" />;

  return (
    <div className="space-y-6">
      <AdminCard
        title="Frequently Asked Questions"
        subtitle={`${faqs.length} in total · shown on /faq, grouped by category`}
      >
        <div className="space-y-4">
          {faqs.length === 0 && (
            <p className="text-sm text-stone-500 text-center py-6">
              No FAQs yet. Add the first one below.
            </p>
          )}
          {faqs.map((faq) => (
            <FaqRow
              key={`${faq.id}-${faq.updatedAt}`}
              faq={faq}
              categories={categories}
              onSave={save}
              onDelete={setToDelete}
            />
          ))}
        </div>
      </AdminCard>

      <AdminCard title="Add a new FAQ">
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Question</label>
            <input
              className={inputClass}
              value={fresh.question}
              onChange={(e) => setFresh({ ...fresh, question: e.target.value })}
              placeholder="e.g. Do Ayurvedic products have an expiry date?"
            />
          </div>
          <div>
            <label className={labelClass}>Answer</label>
            <textarea
              rows={3}
              className={`${inputClass} resize-y`}
              value={fresh.answer}
              onChange={(e) => setFresh({ ...fresh, answer: e.target.value })}
            />
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[180px]">
              <label className={labelClass}>Category</label>
              <input
                className={inputClass}
                list="faq-categories"
                value={fresh.category}
                onChange={(e) =>
                  setFresh({ ...fresh, category: e.target.value })
                }
              />
            </div>
            <button
              type="button"
              onClick={add}
              disabled={adding}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#173D2A] text-white hover:bg-[#0B2416] text-xs font-semibold disabled:opacity-50 transition-colors"
            >
              <Plus className="w-4 h-4" /> {adding ? "Adding…" : "Add FAQ"}
            </button>
          </div>
          {addError && <p className="text-xs text-rose-700">{addError}</p>}
        </div>
      </AdminCard>

      <ConfirmDialog
        isOpen={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        title="Delete this FAQ?"
        message={
          toDelete
            ? `"${toDelete.question}" will be removed from the FAQ page. This cannot be undone.`
            : ""
        }
        confirmText="Delete"
      />
    </div>
  );
};

/* ------------------------------------------------------------------ page */

export const ContentPagesPage = () => {
  const { authFetch } = useAuth();
  const [activeTab, setActiveTab] = useState("privacy");
  const [saved, setSaved] = useState(null); // slug -> last saved editable snapshot
  const [drafts, setDrafts] = useState({}); // slug -> page being edited
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null); // { text, isError }

  const notify = useCallback((text, isError = false) => {
    setToast({ text, isError });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const res = await authFetch("/api/v1/admin/content-pages");
      const json = await res.json();
      if (!res.ok || !Array.isArray(json.data)) throw new Error("bad response");
      const snapshots = {};
      const nextDrafts = {};
      for (const page of json.data) {
        snapshots[page.slug] = editable(page);
        nextDrafts[page.slug] = editable(page);
      }
      setSaved(snapshots);
      setDrafts(nextDrafts);
    } catch {
      setLoadError(true);
    }
  }, [authFetch]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Header Refresh button: reload the saved policy pages but keep any draft with unsaved edits
  const refreshTick = useAdminRefreshSignal();
  const savedRef = useRef(saved);
  savedRef.current = saved;
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;
  useEffect(() => {
    if (refreshTick === 0) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch("/api/v1/admin/content-pages");
        const json = await res.json();
        if (cancelled || !res.ok || !Array.isArray(json.data)) return;
        const snapshots = {};
        const nextDrafts = {};
        for (const page of json.data) {
          const fresh = editable(page);
          const hasEdits =
            savedRef.current?.[page.slug] &&
            draftsRef.current?.[page.slug] &&
            JSON.stringify(savedRef.current[page.slug]) !== JSON.stringify(draftsRef.current[page.slug]);
          snapshots[page.slug] = fresh;
          nextDrafts[page.slug] = hasEdits ? draftsRef.current[page.slug] : editable(page);
        }
        setSaved(snapshots);
        setDrafts(nextDrafts);
      } catch {
        // keep what is on screen
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshTick, authFetch]);

  const isDirty = (slug) =>
    saved &&
    drafts[slug] &&
    JSON.stringify(saved[slug]) !== JSON.stringify(drafts[slug]);
  const policyTab = POLICY_TABS.find((t) => t.id === activeTab);

  const handleSave = async () => {
    if (!policyTab) return;
    setSaving(true);
    try {
      const res = await authFetch(
        `/api/v1/admin/content-pages/${policyTab.id}`,
        {
          method: "PUT",
          body: JSON.stringify(drafts[policyTab.id]),
        },
      );
      if (!res.ok)
        throw new Error(await readError(res, "Could not save this page."));
      const { data } = await res.json();
      setSaved((prev) => ({ ...prev, [policyTab.id]: editable(data) }));
      setDrafts((prev) => ({ ...prev, [policyTab.id]: editable(data) }));
      notify(
        `${data.title} saved. The storefront shows the new text right away.`,
      );
    } catch (err) {
      notify(err.message, true);
    } finally {
      setSaving(false);
    }
  };

  const activeHref = TABS.find((t) => t.id === activeTab)?.href;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 font-sans tracking-tight">
            Content Pages & Policy Editor
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Edit the footer policy pages and the FAQ list. Changes are saved to
            the database and appear on the storefront immediately.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <a
            href={activeHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 whitespace-nowrap px-3.5 py-2 rounded-xl border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 text-xs font-semibold transition-colors"
          >
            <ExternalLink className="w-4 h-4" /> View live page
          </a>
          {policyTab && (
            <button
              type="button"
              onClick={handleSave}
              disabled={!isDirty(activeTab) || saving}
              className="inline-flex items-center gap-1.5 whitespace-nowrap px-4 py-2 rounded-xl bg-[#173D2A] text-white hover:bg-[#0B2416] text-xs font-semibold shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Saving…" : "Save Changes"}</span>
            </button>
          )}
        </div>
      </div>

      {toast && (
        <div
          role="status"
          className={`p-3 border rounded-xl text-xs font-semibold flex items-center gap-2 ${
            toast.isError
              ? "bg-rose-50 border-rose-200 text-rose-800"
              : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}
        >
          {!toast.isError && <Check className="w-4 h-4" />}
          <span>{toast.text}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1 border-b border-stone-200 pb-3">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors inline-flex items-center gap-1.5 ${
              activeTab === tab.id
                ? "bg-[#173D2A] text-white"
                : "text-stone-600 hover:bg-stone-200/60"
            }`}
          >
            {tab.label}
            {isDirty(tab.id) && (
              <span
                className="w-1.5 h-1.5 rounded-full bg-amber-400"
                title="Unsaved changes"
              />
            )}
          </button>
        ))}
      </div>

      {activeTab === "faqs" ? (
        <FaqEditor authFetch={authFetch} notify={notify} />
      ) : loadError ? (
        <AdminLoadError what="the policy pages" onRetry={load} />
      ) : !saved ? (
        <DetailPageSkeleton label="Loading page" />
      ) : (
        <PolicyEditor
          page={drafts[activeTab]}
          onChange={(page) =>
            setDrafts((prev) => ({ ...prev, [activeTab]: page }))
          }
        />
      )}
    </div>
  );
};
