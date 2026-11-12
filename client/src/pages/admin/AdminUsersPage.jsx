import React, { useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { Plus, Edit, Trash2, KeyRound, Copy, Check, Eye, EyeOff, Wand2, AlertTriangle, Crown } from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import { useAuth } from "../../context/AuthContext";
import { AdminCard } from "../../components/admin/common/AdminCard";
import { AdminTable } from "../../components/admin/common/AdminTable";
import { AdminModal, ConfirmDialog } from "../../components/admin/common/AdminModal";

const inputClass =
  "w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#173D2A] focus:border-[#173D2A]";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Random temporary password: letters and digits without look-alikes, always with a letter and a number
const generatePassword = () => {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const all = letters + digits;
  const bytes = new Uint32Array(14);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (b, i) => (i < 2 ? letters : i < 4 ? digits : all)[b % (i < 2 ? letters : i < 4 ? digits : all).length]);
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = bytes[i] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
};

const emptyForm = { name: "", email: "", phone: "", password: "", status: "Active" };

export const AdminUsersPage = () => {
  const { adminTableState, adminUsers, saveAdminUser, deleteAdminUser, resetAdminUserPassword } = useAdmin();
  const { user: me } = useAuth();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const [userToDelete, setUserToDelete] = useState(null);
  const [userToReset, setUserToReset] = useState(null);
  const [busyAction, setBusyAction] = useState(false);
  const [actionError, setActionError] = useState("");

  // Shown once after adding someone or resetting their password
  const [credentials, setCredentials] = useState(null); // { name, email, temporaryPassword, reason }
  const [copied, setCopied] = useState(false);

  const openAdd = () => {
    setSelectedUser(null);
    setFormData(emptyForm);
    setFormError("");
    setFieldErrors({});
    setShowPassword(false);
    setModalOpen(true);
  };

  const openEdit = (user) => {
    setSelectedUser(user);
    setFormData({ name: user.name || "", email: user.email || "", phone: user.phone || "", password: "", status: user.status || "Active" });
    setFormError("");
    setFieldErrors({});
    setModalOpen(true);
  };

  const closeModal = () => {
    if (!savingRef.current) setModalOpen(false);
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    if (savingRef.current) return;

    const errors = {};
    if (formData.name.trim().length < 2) errors.name = "Enter the full name.";
    if (!selectedUser) {
      if (!EMAIL_PATTERN.test(formData.email.trim())) errors.email = "Enter a valid email address.";
      const pw = formData.password;
      if (pw && (pw.length < 8 || !/[A-Za-z]/.test(pw) || !/\d/.test(pw))) {
        errors.password = "Use at least 8 characters with a letter and a number, or leave it blank to generate one.";
      }
    }
    if (formData.phone.trim() && formData.phone.replace(/\D/g, "").length < 10) errors.phone = "Enter a valid phone number, or leave it blank.";
    setFieldErrors(errors);
    setFormError("");
    if (Object.keys(errors).length) return;

    savingRef.current = true;
    setSaving(true);
    try {
      const payload = {
        id: selectedUser?.id,
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        status: formData.status,
        password: formData.password,
      };
      const result = await saveAdminUser(payload);
      setModalOpen(false);
      if (!selectedUser && result?.temporaryPassword) {
        setCredentials({
          name: payload.name,
          email: result.email || payload.email,
          temporaryPassword: result.temporaryPassword,
          reason: "added",
        });
        setCopied(false);
      }
    } catch (err) {
      setFormError(err.message || "The staff account could not be saved. Please try again.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const confirmReset = async () => {
    if (!userToReset || busyAction) return;
    setBusyAction(true);
    setActionError("");
    try {
      const result = await resetAdminUserPassword(userToReset.id);
      setCredentials({
        name: userToReset.name,
        email: result.email || userToReset.email,
        temporaryPassword: result.temporaryPassword,
        reason: "reset",
      });
      setCopied(false);
      setUserToReset(null);
    } catch (err) {
      setActionError(err.message || "The password could not be reset.");
    } finally {
      setBusyAction(false);
    }
  };

  const confirmDelete = async () => {
    if (!userToDelete || busyAction) return;
    setBusyAction(true);
    setActionError("");
    try {
      await deleteAdminUser(userToDelete.id);
      setUserToDelete(null);
    } catch (err) {
      setActionError(err.message || "The staff account could not be removed.");
    } finally {
      setBusyAction(false);
    }
  };

  const copyCredentials = async () => {
    if (!credentials) return;
    const text = `Divyam Ayurveda admin sign-in\nEmail: ${credentials.email}\nTemporary password: ${credentials.temporaryPassword}\nYou will be asked to choose your own password when you first sign in.`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const isMe = (row) => Boolean(me && String(row.id) === String(me.id));
  const iAmOwner = Boolean(me?.isOwner);

  const columns = [
    {
      header: "Staff Member",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#173D2A] text-white flex items-center justify-center font-bold text-xs">
            {row.name ? row.name.charAt(0).toUpperCase() : "A"}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-stone-900 text-xs sm:text-sm">
              {row.name}
              {isMe(row) && <span className="ml-1.5 text-[10px] font-semibold text-stone-500">(you)</span>}
              {row.isOwner && (
                <span className="ml-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#173D2A] text-[#E8D9B5] align-middle">
                  <Crown className="w-2.5 h-2.5" /> Owner
                </span>
              )}
            </div>
            <div className="text-[11px] text-stone-500 break-all">{row.email}</div>
            {row.phone && <div className="text-[11px] text-stone-400">{row.phone}</div>}
          </div>
        </div>
      ),
    },
    {
      header: "Last Sign-in",
      render: (row) => <span className="text-xs text-stone-500 font-medium">{row.lastLogin || "Never"}</span>,
    },
    {
      header: "Status",
      render: (row) => (
        <div className="flex flex-col items-start gap-1">
          <span
            className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
              row.status === "Active" ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-600"
            }`}
          >
            {row.status || "Active"}
          </span>
          {row.mustChangePassword && (
            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800" title="They have not chosen their own password yet">
              Temporary password
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Actions",
      align: "right",
      render: (row) =>
        row.isOwner ? (
          <span className="text-[11px] text-stone-400" title="The owner account is changed by the owner from Profile & Security">
            Managed in Profile &amp; Security
          </span>
        ) : (
        <div className="flex items-center justify-end gap-1.5">
          <button type="button" onClick={() => openEdit(row)} className="p-1.5 text-stone-500 hover:text-emerald-800 rounded-lg transition-colors" title="Edit" aria-label={`Edit ${row.name}`}>
            <Edit className="w-4 h-4" />
          </button>
          {!isMe(row) && (
            <>
              <button
                type="button"
                onClick={() => {
                  setActionError("");
                  setUserToReset(row);
                }}
                className="p-1.5 text-stone-500 hover:text-amber-700 rounded-lg transition-colors"
                title="Reset password"
                aria-label={`Reset password for ${row.name}`}
              >
                <KeyRound className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setActionError("");
                  setUserToDelete(row);
                }}
                className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg transition-colors"
                title="Remove"
                aria-label={`Remove ${row.name}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
        ),
    },
  ];

  // Team management is the owner's alone (the server enforces it too); anyone else is sent back to the dashboard
  if (!iAmOwner) return <Navigate to="/admin" replace />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 font-sans tracking-tight">Admin Staff</h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            People who can sign in to this admin. Only you, as the owner, can add, change or remove them. Everyone here has full access to the store. New accounts start with a temporary password they must change at first sign-in.
          </p>
        </div>

        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#173D2A] text-white hover:bg-[#0B2416] text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Staff Member</span>
        </button>
      </div>

      <AdminCard noPadding={true}>
        <AdminTable
          {...adminTableState("users", adminUsers)}
          columns={columns}
          data={adminUsers}
          keyField="id"
          emptyMessage="No admin staff accounts found."
        />
      </AdminCard>

      {/* Add / edit */}
      <AdminModal
        isOpen={modalOpen}
        onClose={closeModal}
        title={selectedUser ? `Edit ${selectedUser.name}` : "Add Staff Member"}
        subtitle={selectedUser ? "Name, phone and whether they can sign in" : "They sign in with the email and temporary password below"}
        maxWidth="max-w-lg"
        footer={
          <>
            <button type="button" onClick={closeModal} disabled={saving} className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl disabled:opacity-60">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold bg-[#173D2A] text-white hover:bg-[#0B2416] rounded-xl shadow-xs disabled:opacity-60"
            >
              {saving ? "Saving..." : selectedUser ? "Save changes" : "Add staff member"}
            </button>
          </>
        }
      >
        <form onSubmit={handleSave} noValidate className="space-y-4">
          {formError && (
            <div role="alert" className="p-3 rounded-xl border bg-rose-50 border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label htmlFor="staff-name" className="block text-xs font-semibold text-stone-700 mb-1">Full name *</label>
            <input id="staff-name" type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Rameshwar Joshi" autoComplete="off" className={`${inputClass} ${fieldErrors.name ? "border-rose-400" : ""}`} />
            {fieldErrors.name && <p role="alert" className="text-[11px] text-rose-600 mt-1">{fieldErrors.name}</p>}
          </div>

          <div>
            <label htmlFor="staff-email" className="block text-xs font-semibold text-stone-700 mb-1">Email address {selectedUser ? "" : "*"}</label>
            <input
              id="staff-email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              readOnly={Boolean(selectedUser)}
              placeholder="name@yourcompany.com"
              autoComplete="off"
              className={`${inputClass} ${selectedUser ? "bg-stone-50 text-stone-600 border-stone-200" : ""} ${fieldErrors.email ? "border-rose-400" : ""}`}
            />
            {selectedUser && <p className="text-[11px] text-stone-500 mt-1">They change their own email from Profile &amp; Security.</p>}
            {fieldErrors.email && <p role="alert" className="text-[11px] text-rose-600 mt-1">{fieldErrors.email}</p>}
          </div>

          <div>
            <label htmlFor="staff-phone" className="block text-xs font-semibold text-stone-700 mb-1">Phone <span className="font-normal text-stone-400">(optional)</span></label>
            <input id="staff-phone" type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="e.g. 9876543210" autoComplete="off" className={`${inputClass} ${fieldErrors.phone ? "border-rose-400" : ""}`} />
            {fieldErrors.phone && <p role="alert" className="text-[11px] text-rose-600 mt-1">{fieldErrors.phone}</p>}
          </div>

          {!selectedUser && (
            <div>
              <label htmlFor="staff-password" className="block text-xs font-semibold text-stone-700 mb-1">Temporary password <span className="font-normal text-stone-400">(optional)</span></label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    id="staff-password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Leave blank to generate one"
                    autoComplete="new-password"
                    className={`${inputClass} pr-10 ${fieldErrors.password ? "border-rose-400" : ""}`}
                  />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute inset-y-0 right-0 px-3 text-stone-500 hover:text-stone-800">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, password: generatePassword() });
                    setShowPassword(true);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50"
                >
                  <Wand2 className="w-3.5 h-3.5" /> Generate
                </button>
              </div>
              {fieldErrors.password ? (
                <p role="alert" className="text-[11px] text-rose-600 mt-1">{fieldErrors.password}</p>
              ) : (
                <p className="text-[11px] text-stone-500 mt-1">You will see it once after saving, to pass on to them. They must replace it at first sign-in.</p>
              )}
            </div>
          )}

          {selectedUser && (
            <div>
              <label htmlFor="staff-status" className="block text-xs font-semibold text-stone-700 mb-1">Status</label>
              <select
                id="staff-status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                disabled={isMe(selectedUser)}
                className={`${inputClass} text-stone-700 disabled:bg-stone-50`}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              <p className="text-[11px] text-stone-500 mt-1">
                {isMe(selectedUser)
                  ? "You can't deactivate your own account."
                  : formData.status === "Inactive"
                    ? "Signed out and cannot sign in."
                    : "Can sign in."}
              </p>
            </div>
          )}
        </form>
      </AdminModal>

      {/* Temporary password: shown once */}
      <AdminModal
        isOpen={Boolean(credentials)}
        onClose={() => setCredentials(null)}
        title={credentials?.reason === "reset" ? "New temporary password" : "Staff member added"}
        subtitle="This is the only time it is shown"
        maxWidth="max-w-md"
        footer={
          <>
            <button type="button" onClick={copyCredentials} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border border-stone-300 text-stone-700 hover:bg-stone-50 rounded-xl">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy sign-in details"}
            </button>
            <button type="button" onClick={() => setCredentials(null)} className="px-4 py-2 text-xs font-semibold bg-[#173D2A] text-white hover:bg-[#0B2416] rounded-xl">
              Done
            </button>
          </>
        }
      >
        {credentials && (
          <div className="space-y-4 text-sm">
            <p className="text-stone-600">
              Send these details to <strong>{credentials.name}</strong> privately. They will be asked to choose their own password the first time they sign in.
            </p>
            <dl className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-3">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">Email</dt>
                <dd className="text-stone-900 break-all">{credentials.email}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">Temporary password</dt>
                <dd className="font-mono text-base font-bold text-stone-900 tracking-wider select-all">{credentials.temporaryPassword}</dd>
              </div>
            </dl>
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
              We don't store this password and can't show it again. If it is lost, use <strong>Reset password</strong> to issue a new one.
            </p>
          </div>
        )}
      </AdminModal>

      {/* Reset password */}
      <ConfirmDialog
        isOpen={Boolean(userToReset)}
        onClose={() => !busyAction && setUserToReset(null)}
        onConfirm={confirmReset}
        title="Reset password"
        message={
          <>
            Issue a new temporary password for {userToReset?.name}? They will be signed out everywhere and must choose a new password at their next sign-in.
            {actionError && <span className="block mt-2 text-rose-600 font-semibold">{actionError}</span>}
          </>
        }
        confirmText="Reset password"
        confirmVariant="primary"
        loading={busyAction}
      />

      {/* Remove */}
      <ConfirmDialog
        isOpen={Boolean(userToDelete)}
        onClose={() => !busyAction && setUserToDelete(null)}
        onConfirm={confirmDelete}
        title="Remove staff member"
        message={
          <>
            Remove {userToDelete?.name}'s admin account? They are signed out immediately and can no longer sign in.
            {actionError && <span className="block mt-2 text-rose-600 font-semibold">{actionError}</span>}
          </>
        }
        confirmText="Remove"
        loading={busyAction}
      />
    </div>
  );
};
