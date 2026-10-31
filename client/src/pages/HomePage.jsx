import React, { Suspense } from "react";
import { HeroBanner } from "../components/home/HeroBanner";
import { lazyPage } from "../utils/lazyPage";

const HomeSections = lazyPage(() => import("../components/home/HomeSections"), "HomeSections");

export const HomePage = () => {
  return (
    <div className="flex flex-col w-full">
      {/* 4. Hero Banner & 5. Trust Indicators */}
      <HeroBanner />

      {/* Sections 6-14 load after the hero */}
      <Suspense fallback={null}>
        <HomeSections />
      </Suspense>
    </div>
  );
};
