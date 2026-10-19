import React, { useState } from "react";
import { ShieldCheck, Plus, Edit, Trash2, Key, CheckCircle2 } from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import { AdminCard } from "../../components/admin/common/AdminCard";
import { AdminTable } from "../../components/admin/common/AdminTable";
import { AdminModal, ConfirmDialog } from "../../components/admin/common/AdminModal";
import { ROLE_DEFINITIONS } from "../../data/adminUsers";
import { formatDate } from "../../utils/formatters";

export const AdminUsersPage = () => {
  const { adminUsers, saveAdminUser, deleteAdminUser } = useAdmin();
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);

  const defaultForm = {
    name: "",
    email: "",
    role: "Super Admin",
    status: "Active",
    password: "",
  };

  const [formData, setFormData] = useState(defaultForm);

  const handleOpenAdd = () => {
    setSelectedUser(null);
    setFormData(defaultForm);
    setModalOpen(true);
  };

  const handleOpenEdit = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status || "Active",
      password: "",
    });
    setModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) return;

    const roleObj = ROLE_DEFINITIONS[formData.role] || { name: "Staff" };

    const payload = {
      ...formData,
      id: selectedUser ? selectedUser.id : "usr-" + Date.now(),
      roleName: roleObj.name,
      lastLogin: selectedUser?.lastLogin || "Just now",
      createdAt: selectedUser?.createdAt || new Date().toISOString(),
    };

    saveAdminUser(payload);
    setModalOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (userToDelete) {
      deleteAdminUser(userToDelete);
      setUserToDelete(null);
      setDeleteConfirmOpen(false);
    }
  };

  const columns = [
    {
      header: "Staff Member",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#173D2A] text-white flex items-center justify-center font-bold text-xs">
            {row.name ? row.name.charAt(0) : "A"}
          </div>
          <div>
            <div className="font-semibold text-stone-900 text-xs sm:text-sm">
              {row.name}
            </div>
            <div className="text-[11px] text-stone-500">{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      header: "Role & Privileges",
      render: (row) => (
        <span className="inline-block px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-900 border border-emerald-200">
          {row.roleName || ROLE_DEFINITIONS[row.role]?.name || "Staff"}
        </span>
      ),
    },
    {
      header: "Last Session",
      render: (row) => (
        <span className="text-xs text-stone-500 font-medium">
          {row.lastLogin || "Never"}
        </span>
      ),
    },
    {
      header: "Status",
      render: (row) => (
        <span
          className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
            row.status === "Active"
              ? "bg-emerald-100 text-emerald-800"
              : "bg-stone-100 text-stone-600"
          }`}
        >
          {row.status || "Active"}
        </span>
      ),
    },
    {
      header: "Actions",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => handleOpenEdit(row)}
            className="p-1.5 text-stone-500 hover:text-emerald-800 rounded-lg transition-colors"
          >
            <Edit className="w-4 h-4" />
          </button>
          {row.email !== "admin@divyamayurveda.demo" && (
            <button
              type="button"
              onClick={() => {
                setUserToDelete(row.id);
                setDeleteConfirmOpen(true);
              }}
              className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 font-sans tracking-tight">
            Administrative Staff & Access Control
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Grant role-based credentials to inventory managers, order fulfillers, and customer support.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#173D2A] text-white hover:bg-[#0B2416] text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Invite Admin User</span>
        </button>
      </div>

      <AdminCard noPadding={true}>
        <AdminTable
          columns={columns}
          data={adminUsers}
          keyField="id"
          emptyMessage="No admin staff accounts found."
        />
      </AdminCard>

      {/* Add / Edit Admin User Modal */}
      <AdminModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedUser ? `Edit Staff: ${selectedUser.name}` : "Create Staff Account"}
        subtitle="Assign roles and operational administrative privileges"
        footer={
          <>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-xs font-semibold bg-[#173D2A] text-white hover:bg-[#0B2416] rounded-xl shadow-xs"
            >
              {selectedUser ? "Update Account" : "Save Account"}
            </button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g. Rameshwar Joshi"
              className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Corporate Email Address *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              placeholder="e.g. rameshwar@divyamayurveda.demo"
              className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Access Role
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white text-stone-700"
            >
              {Object.entries(ROLE_DEFINITIONS)
                .filter(([k]) => !k.includes("_") && k[0] === k[0].toUpperCase())
                .map(([key, r]) => (
                  <option key={key} value={key}>
                    {r.name} — {r.description}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white text-stone-700"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </form>
      </AdminModal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Revoke Admin Access"
        message="Are you sure you want to delete this administrative account?"
      />
    </div>
  );
};

