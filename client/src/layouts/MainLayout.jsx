import React, { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnnouncementBar } from "../components/layout/AnnouncementBar";
import { Header } from "../components/layout/Header";
import { CategoryNav } from "../components/layout/CategoryNav";
import { Footer } from "../components/layout/Footer";
import { ReferralBanner } from "../components/referrals/ReferralBanner";
import { useHeroNav } from "../context/HeroNavContext";

export const MainLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { heroNavState } = useHeroNav();
  const isHomePage = location.pathname === "/";

  // Non-homepage routes: Standard sticky header layout
  if (!isHomePage) {
    return (
      <div className="min-h-screen flex flex-col bg-white text-[#171A17] antialiased">
        <AnnouncementBar />
        <Header
          isSticky={true}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />
        <CategoryNav
          isMobileMenuOpen={isMobileMenuOpen}
          onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
        />
        <main className="flex-1">
          <Outlet />
        </main>
        <ReferralBanner />
        <Footer />
      </div>
    );
  }

  // Homepage: 
  // 1. In-flow navigation at the top (scrolls away cleanly with initial scroll)
  // 2. Fixed full navigation (AnnouncementBar + Header + CategoryNav) slides down smoothly when hero banner finishes
  const isFixedNavVisible = heroNavState === "sticky-full";

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#171A17] antialiased">
      {/* 1. Natural in-flow navigation stack at top of homepage */}
      <div className="w-full relative z-30">
        <AnnouncementBar />
        <Header
          isSticky={false}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />
        <CategoryNav
          isMobileMenuOpen={isMobileMenuOpen}
          onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
          hideMobileDrawer={isFixedNavVisible}
        />
      </div>

      {/* 2. Fixed Full Navigation Stack (Slides down seamlessly when hero banner completes at TrustBadges) */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-out shadow-xl bg-white ${
          isFixedNavVisible
            ? "translate-y-0 opacity-100 pointer-events-auto"
            : "-translate-y-full opacity-0 pointer-events-none"
        }`}
      >
        <AnnouncementBar />
        <Header
          isSticky={false}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />
        <CategoryNav
          isMobileMenuOpen={isMobileMenuOpen}
          onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
          hideMobileDrawer={!isFixedNavVisible}
        />
      </div>

      {/* Page Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Floating Referral Attributed Banner */}
      <ReferralBanner />

      {/* Footer */}
      <Footer />
    </div>
  );
};


