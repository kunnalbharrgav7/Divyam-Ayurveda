import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Mail, KeyRound, ShieldCheck, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { AdminCard } from "../../components/admin/common/AdminCard";
import { AdminLoadError } from "../../components/admin/common/AdminLoadError";

const inputClass =
  "w-full px-3 py-2 text-sm rounded-xl border bg-white focus:outline-none focus:ring-1 focus:ring-[#173D2A] focus:border-[#173D2A]";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const formatDate = (value) => (value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—");

// The server answers { success, data } or { success: false, error: { message, details: [{ path, message }] } }
const readError = async (res, fallback) => {
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* not JSON */
  }
  const fields = {};
  for (const d of json?.error?.details || []) {
    const field = String(d.path || "").split(".").pop();
    if (field && !fields[field]) fields[field] = d.message;
  }
  return { message: json?.error?.message || fallback, fields };
};

const Field = ({ id, label, error, hint, children }) => (
  <div>
    <label htmlFor={id} className="block text-xs font-semibold text-stone-700 mb-1">
      {label}
    </label>
    {children}
    {hint && !error && <p className="text-[11px] text-stone-500 mt-1">{hint}</p>}
    {error && (
      <p id={`${id}-error`} role="alert" className="text-[11px] text-rose-600 mt-1">
        {error}
      </p>
    )}
  </div>
);

const PasswordInput = ({ id, value, onChange, autoComplete, error, disabled }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${inputClass} pr-10 ${error ? "border-rose-400" : "border-stone-300"}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 px-3 text-stone-500 hover:text-stone-800 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#173D2A] rounded-r-xl"
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
};

const FormAlert = ({ message }) =>
  message ? (
    <div role="alert" className="p-3 rounded-xl border bg-rose-50 border-rose-200 text-rose-800 text-xs flex items-start gap-2">
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  ) : null;

const SubmitButton = ({ busy, children }) => (
  <button
    type="submit"
    disabled={busy}
    className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-[#173D2A] hover:bg-[#0B2416] text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A9D18E]"
  >
    {busy && <Loader2 className="w-4 h-4 animate-spin" />}
    {children}
  </button>
);

export const ProfileSecurityPage = () => {
  const { authFetch, logoutAdmin } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loadState, setLoadState] = useState("loading"); // loading | ready | error

  // After a credential change the server ends every session: sign out here too and go to the login page
  const signOutWithMessage = useCallback(
    (message) => {
      navigate("/login", { replace: true, state: { message } });
      logoutAdmin();
    },
    [navigate, logoutAdmin]
  );

  const loadProfile = useCallback(async () => {
    setLoadState("loading");
    try {
      const res = await authFetch("/api/v1/admin/profile");
      if (res.status === 401) {
        signOutWithMessage("Your session has ended. Please sign in again.");
        return;
      }
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error("bad response");
      setProfile(json.data);
      setLoadState("ready");
    } catch {
      setLoadState("error");
    }
    // authFetch changes identity on every render of the provider; loading once on mount is intended
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // ---------------------------------------------------------------- email form
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailErrors, setEmailErrors] = useState({});
  const [emailFormError, setEmailFormError] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const emailBusyRef = useRef(false);

  const submitEmail = async (e) => {
    e.preventDefault();
    if (emailBusyRef.current) return;
    setEmailFormError("");

    const errors = {};
    const trimmed = newEmail.trim();
    if (!trimmed) errors.newEmail = "Enter the new email address.";
    else if (!EMAIL_PATTERN.test(trimmed)) errors.newEmail = "Enter a valid email address.";
    else if (trimmed.toLowerCase() === (profile?.email || "").toLowerCase()) errors.newEmail = "This is already your email address.";
    if (!emailPassword) errors.currentPassword = "Enter your current password to confirm.";
    setEmailErrors(errors);
    if (Object.keys(errors).length) return;

    emailBusyRef.current = true;
    setEmailBusy(true);
    try {
      const res = await authFetch("/api/v1/admin/profile/email", {
        method: "PATCH",
        body: JSON.stringify({ newEmail: trimmed, currentPassword: emailPassword }),
      });
      if (res.ok) {
        setNewEmail("");
        setEmailPassword("");
        signOutWithMessage("Your email address has been changed. Please sign in again using your new email address.");
        return;
      }
      if (res.status === 401) {
        signOutWithMessage("Your session has ended. Please sign in again.");
        return;
      }
      const { message, fields } = await readError(res, "Could not update the email address. Please try again.");
      setEmailPassword(""); // never keep a rejected password in the form
      if (Object.keys(fields).length) setEmailErrors(fields);
      else setEmailFormError(message);
    } catch {
      setEmailFormError("Cannot reach the server. Check your connection and try again.");
    } finally {
      emailBusyRef.current = false;
      setEmailBusy(false);
    }
  };

  // ---------------------------------------------------------------- password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwErrors, setPwErrors] = useState({});
  const [pwFormError, setPwFormError] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const pwBusyRef = useRef(false);

  const submitPassword = async (e) => {
    e.preventDefault();
    if (pwBusyRef.current) return;
    setPwFormError("");

    const errors = {};
    if (!currentPassword) errors.currentPassword = "Enter your current password.";
    if (newPassword.length < 8) errors.newPassword = "Use at least 8 characters.";
    else if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) errors.newPassword = "Include at least one letter and one number.";
    else if (newPassword === currentPassword) errors.newPassword = "The new password must be different from the current one.";
    if (confirmPassword !== newPassword) errors.confirmPassword = "The two passwords don't match.";
    setPwErrors(errors);
    if (Object.keys(errors).length) return;

    pwBusyRef.current = true;
    setPwBusy(true);
    try {
      const res = await authFetch("/api/v1/admin/profile/password", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        signOutWithMessage("Your password has been changed. Please sign in again using your new password.");
        return;
      }
      if (res.status === 401) {
        signOutWithMessage("Your session has ended. Please sign in again.");
        return;
      }
      const { message, fields } = await readError(res, "Could not change the password. Please try again.");
      setCurrentPassword(""); // a wrong or rejected current password is cleared
      if (Object.keys(fields).length) setPwErrors(fields);
      else setPwFormError(message);
    } catch {
      setPwFormError("Cannot reach the server. Check your connection and try again.");
    } finally {
      pwBusyRef.current = false;
      setPwBusy(false);
    }
  };

  // ---------------------------------------------------------------- render
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900 font-sans tracking-tight">Profile &amp; Security</h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          Your account details and sign-in credentials. Changing your email or password signs you out everywhere.
        </p>
      </div>

      {profile?.mustChangePassword && (
        <div role="alert" className="p-4 rounded-xl border bg-amber-50 border-amber-200 text-amber-900 text-sm flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
          <span>
            You signed in with a temporary password. <strong>Choose your own password below</strong> to continue. The rest of the admin
            stays locked until you do.
          </span>
        </div>
      )}

      {loadState === "loading" && (
        <div role="status" className="flex items-center gap-2 text-sm text-stone-500 p-6">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading your profile…
        </div>
      )}

      {loadState === "error" && <AdminLoadError what="your profile" onRetry={loadProfile} />}

      {loadState === "ready" && profile && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <AdminCard title="Your account" subtitle="As stored on the server" className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-[#173D2A] text-white flex items-center justify-center font-bold text-lg" aria-hidden="true">
                {(profile.name || "A").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-stone-900 truncate">{profile.name}</div>
                <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 mt-0.5">
                  <ShieldCheck className="w-3 h-3" /> {profile.roles?.length ? profile.roles.join(", ") : "Staff"}
                </div>
              </div>
            </div>
            <dl className="space-y-3 text-sm">
              {[
                ["Email", profile.email],
                ["Phone", profile.phone || "—"],
                ["Status", profile.status === "active" ? "Active" : profile.status],
                ["Last sign-in", formatDate(profile.lastLoginAt)],
                ["Password last changed", profile.passwordChangedAt ? formatDate(profile.passwordChangedAt) : "Never changed from the original"],
                ["Account created", formatDate(profile.createdAt)],
              ].map(([term, value]) => (
                <div key={term}>
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">{term}</dt>
                  <dd className="text-stone-900 break-words">{value}</dd>
                </div>
              ))}
            </dl>
          </AdminCard>

          <div className="lg:col-span-2 space-y-6">
            <AdminCard title="Change email address" subtitle="You will sign in with the new address from now on">
              <form onSubmit={submitEmail} noValidate className="space-y-4" aria-busy={emailBusy}>
                <FormAlert message={emailFormError} />
                <Field id="current-email" label="Current email address">
                  <input id="current-email" type="email" value={profile.email} readOnly className={`${inputClass} border-stone-200 bg-stone-50 text-stone-600`} />
                </Field>
                <Field id="new-email" label="New email address" error={emailErrors.newEmail}>
                  <input
                    id="new-email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    autoComplete="off"
                    disabled={emailBusy}
                    aria-invalid={Boolean(emailErrors.newEmail)}
                    aria-describedby={emailErrors.newEmail ? "new-email-error" : undefined}
                    className={`${inputClass} ${emailErrors.newEmail ? "border-rose-400" : "border-stone-300"}`}
                  />
                </Field>
                <Field id="email-current-password" label="Current password" error={emailErrors.currentPassword} hint="Needed to confirm it's you.">
                  <PasswordInput id="email-current-password" value={emailPassword} onChange={setEmailPassword} autoComplete="current-password" error={emailErrors.currentPassword} disabled={emailBusy} />
                </Field>
                <div className="flex items-center gap-3 flex-wrap">
                  <SubmitButton busy={emailBusy}>
                    <Mail className="w-4 h-4" /> {emailBusy ? "Updating…" : "Update email"}
                  </SubmitButton>
                </div>
              </form>
            </AdminCard>

            <AdminCard title="Change password" subtitle="At least 8 characters, with a letter and a number">
              <form onSubmit={submitPassword} noValidate className="space-y-4" aria-busy={pwBusy}>
                <FormAlert message={pwFormError} />
                {/* Lets password managers file the new password under this account */}
                <input type="text" name="username" autoComplete="username" value={profile.email} readOnly tabIndex={-1} aria-hidden="true" className="sr-only" />
                <Field id="pw-current" label="Current password" error={pwErrors.currentPassword}>
                  <PasswordInput id="pw-current" value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" error={pwErrors.currentPassword} disabled={pwBusy} />
                </Field>
                <Field id="pw-new" label="New password" error={pwErrors.newPassword}>
                  <PasswordInput id="pw-new" value={newPassword} onChange={setNewPassword} autoComplete="new-password" error={pwErrors.newPassword} disabled={pwBusy} />
                </Field>
                <Field id="pw-confirm" label="Confirm new password" error={pwErrors.confirmPassword}>
                  <PasswordInput id="pw-confirm" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" error={pwErrors.confirmPassword} disabled={pwBusy} />
                </Field>
                <div className="flex items-center gap-3 flex-wrap">
                  <SubmitButton busy={pwBusy}>
                    <KeyRound className="w-4 h-4" /> {pwBusy ? "Changing…" : "Change password"}
                  </SubmitButton>
                </div>
              </form>
            </AdminCard>

            <div className="flex items-start gap-2 text-xs text-stone-500 p-1">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>
                After either change you are signed out on this and every other device, and must sign in again. Too many wrong
                passwords temporarily lock the account.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
