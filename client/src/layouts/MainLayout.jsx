import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { AnnouncementBar } from "../components/layout/AnnouncementBar";
import { Header } from "../components/layout/Header";
import { CategoryNav } from "../components/layout/CategoryNav";
import { Footer } from "../components/layout/Footer";

export const MainLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#171A17] antialiased">
      {/* 1. Announcement Bar */}
      <AnnouncementBar />

      {/* 2. Main Header */}
      <Header onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />

      {/* 3. Category Navigation */}
      <CategoryNav
        isMobileMenuOpen={isMobileMenuOpen}
        onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
      />

      {/* Page Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

