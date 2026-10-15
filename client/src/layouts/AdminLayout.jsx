import React, { useState } from "react";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AdminSidebar } from "../components/admin/layout/AdminSidebar";
import { AdminHeader } from "../components/admin/layout/AdminHeader";

export const AdminLayout = () => {
  const { isAdmin, adminUser } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();

  // If not logged in as admin, redirect to admin login
  if (!isAdmin || !adminUser) {
    return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />;
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
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;

