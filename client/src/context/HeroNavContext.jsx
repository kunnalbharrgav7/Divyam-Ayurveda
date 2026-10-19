import React, { createContext, useContext, useState } from "react";

const HeroNavContext = createContext({
  heroNavState: "top", // "top" | "hero" | "sticky-full"
  setHeroNavState: () => {},
});

export const HeroNavProvider = ({ children }) => {
  const [heroNavState, setHeroNavState] = useState("top");

  return (
    <HeroNavContext.Provider value={{ heroNavState, setHeroNavState }}>
      {children}
    </HeroNavContext.Provider>
  );
};

export const useHeroNav = () => useContext(HeroNavContext);

