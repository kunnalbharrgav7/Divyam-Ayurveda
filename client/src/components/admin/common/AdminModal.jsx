import React, { useEffect } from "react";
import { X } from "lucide-react";

export const AdminModal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = "max-w-2xl",
  footer,
}) => {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleEsc);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        <div
          className={`relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 w-full ${maxWidth} border border-stone-200 animate-in zoom-in-95`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4 bg-stone-50/70">
            <div>
              <h3 className="text-lg font-bold text-stone-900 font-sans">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-stone-500 mt-0.5">{subtitle}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/70 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 max-h-[calc(85vh-130px)] overflow-y-auto">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="flex items-center justify-end gap-3 border-t border-stone-200 bg-stone-50/70 px-6 py-3.5">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to perform this action? This cannot be undone.",
  confirmText = "Confirm",
  confirmVariant = "danger",
  loading = false,
}) => {
  if (!isOpen) return null;

  const btnStyle =
    confirmVariant === "danger"
      ? "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200"
      : "bg-[#173D2A] hover:bg-[#0B2416] text-white";

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="max-w-md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-200/70 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-semibold rounded-lg shadow-xs transition-colors ${btnStyle}`}
          >
            {loading ? "Processing..." : confirmText}
          </button>
        </>
      }
    >
      <p className="text-sm text-stone-600 leading-relaxed">{message}</p>
    </AdminModal>
  );
};

