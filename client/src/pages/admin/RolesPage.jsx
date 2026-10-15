import React from "react";
import { Check, X, Shield, Lock, Users } from "lucide-react";
import { AdminCard } from "../../components/admin/common/AdminCard";
import { ROLE_DEFINITIONS, PERMISSIONS_LIST } from "../../data/adminUsers";

export const RolesPage = () => {
  // Only display primary role entries (ignoring alias keys)
  const displayRoles = Object.entries(ROLE_DEFINITIONS).filter(
    ([key]) => !key.includes("_") && key[0] === key[0].toUpperCase()
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-900 font-sans tracking-tight">
          Roles & Permission Architecture
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          Review granular system capabilities and role-based access control (RBAC) across Divyam Ayurveda.
        </p>
      </div>

      {/* Role Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {displayRoles.map(([key, role]) => (
          <div
            key={key}
            className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-sans font-bold text-base text-stone-900">
                  {role.name || key}
                </span>
                <span className="w-8 h-8 rounded-lg bg-emerald-50 text-[#173D2A] flex items-center justify-center font-mono text-xs font-bold">
                  {(role.permissions || []).length}
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                {role.description}
              </p>
            </div>

            <div className="mt-4 pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-400">
              <span className="font-mono text-[11px] uppercase tracking-wider">
                Key: {key}
              </span>
              <span className="text-emerald-800 font-medium">Active Policy</span>
            </div>
          </div>
        ))}
      </div>

      {/* Full Permissions Matrix Table */}
      <AdminCard
        title="Granular Permission Access Matrix"
        subtitle="Verification of operational capabilities per administrative role"
        noPadding={true}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-stone-50/80 text-[11px] font-semibold uppercase tracking-wider text-stone-500 border-b border-stone-200">
              <tr>
                <th className="px-4 py-3 min-w-[200px]">Permission Feature</th>
                {displayRoles.map(([key, role]) => (
                  <th key={key} className="px-3 py-3 text-center whitespace-nowrap">
                    {role.name || key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {PERMISSIONS_LIST.map((perm) => (
                <tr key={perm.id} className="hover:bg-stone-50/50">
                  <td className="px-4 py-3.5 font-medium text-stone-900">
                    <div>{perm.label}</div>
                    <div className="font-mono text-[10px] text-stone-400">
                      {perm.id}
                    </div>
                  </td>

                  {displayRoles.map(([key, role]) => {
                    const hasPerm = (role?.permissions || []).includes(perm.id);
                    return (
                      <td key={key} className="px-3 py-3.5 text-center">
                        {hasPerm ? (
                          <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                        ) : (
                          <X className="w-4 h-4 text-stone-300 mx-auto" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </div>
  );
};

