import React, { Suspense, useEffect, useState } from "react";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAdmin } from "../context/AdminContext";
import { AdminSidebar } from "../components/admin/layout/AdminSidebar";
import { AdminHeader } from "../components/admin/layout/AdminHeader";
import { PageSkeleton } from "../components/common/Skeleton";

export const AdminLayout = () => {
  const { isAdmin, adminUser, syncStaffFlags } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const { loadAdminData } = useAdmin();

  // Admin data is fetched only once the admin area is opened (idempotent per sign-in)
  useEffect(() => {
    if (isAdmin) loadAdminData();
  }, [isAdmin, loadAdminData]);

  // Pick up owner / temporary-password changes made since this browser last signed in
  useEffect(() => {
    if (isAdmin) syncStaffFlags();
    // once per admin visit; syncStaffFlags changes identity on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // If not logged in as admin, redirect to unified login
  if (!isAdmin || !adminUser) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // A new or reset account has only a temporary password: nothing else in the admin works until it is replaced
  if (adminUser.mustChangePassword && location.pathname !== "/admin/profile") {
    return <Navigate to="/admin/profile" replace />;
  }

  return (
    <div className="admin-layout min-h-screen bg-[#F7F8F4] text-stone-800 font-sans antialiased selection:bg-[#A9D18E] selection:text-[#0B2416]">
      {/* Admin Sidebar Navigation */}
      <AdminSidebar
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Top Header */}
      <AdminHeader
        isCollapsed={isCollapsed}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main Content Area */}
      <main
        className={`transition-all duration-300 ease-in-out p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-4rem)] ${
          isCollapsed ? "lg:ml-20" : "lg:ml-64"
        }`}
      >
        <div className="max-w-7xl mx-auto space-y-6">
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;

