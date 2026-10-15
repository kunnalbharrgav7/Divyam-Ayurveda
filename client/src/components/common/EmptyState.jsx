import React from "react";
import { Link } from "react-router-dom";
import { PackageOpen } from "lucide-react";

export const EmptyState = ({
  icon: Icon = PackageOpen,
  title = "No items found",
  description = "We couldn't find what you were looking for.",
  actionText = "Continue Shopping",
  actionLink = "/products",
  onAction = null,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 sm:p-12 bg-white rounded-2xl border border-[#E5E7DF] my-6">
      <div className="w-16 h-16 rounded-full bg-[#F4F4EE] flex items-center justify-center text-[#173D2A] mb-4">
        <Icon size={32} />
      </div>
      <h3 className="text-xl font-serif font-semibold text-[#171A17] mb-2">{title}</h3>
      <p className="text-sm text-[#666B64] max-w-md mb-6">{description}</p>
      {onAction ? (
        <button
          onClick={onAction}
          className="px-6 py-2.5 bg-[#173D2A] hover:bg-[#0B2416] text-white text-sm font-medium rounded-lg transition-colors shadow-xs"
        >
          {actionText}
        </button>
      ) : actionLink ? (
        <Link
          to={actionLink}
          className="px-6 py-2.5 bg-[#173D2A] hover:bg-[#0B2416] text-white text-sm font-medium rounded-lg transition-colors shadow-xs"
        >
          {actionText}
        </Link>
      ) : null}
    </div>
  );
};

