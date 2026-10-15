import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

export const Breadcrumbs = ({ items = [] }) => {
  return (
    <nav className="flex items-center text-xs text-[#666B64] py-3 overflow-x-auto whitespace-nowrap" aria-label="Breadcrumb">
      <Link
        to="/"
        className="flex items-center hover:text-[#173D2A] transition-colors"
        title="Home"
      >
        <Home size={14} className="mr-1" />
        <span>Home</span>
      </Link>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            <ChevronRight size={12} className="mx-2 text-stone-400 shrink-0" />
            {isLast || !item.href ? (
              <span className="font-medium text-[#171A17] truncate max-w-[200px] sm:max-w-xs">
                {item.label}
              </span>
            ) : (
              <Link
                to={item.href}
                className="hover:text-[#173D2A] transition-colors truncate max-w-[160px]"
              >
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

