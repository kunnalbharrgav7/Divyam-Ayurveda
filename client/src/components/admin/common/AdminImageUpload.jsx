import React, { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon, Link2, Check, RefreshCw } from "lucide-react";

/**
 * AdminImageUpload Component
 * Replaces plain URL text inputs with an interactive file uploader.
 * Supports file drag-and-drop, local file picking (converted to base64 Data URL),
 * live thumbnail preview, change/remove actions, and an optional URL paste toggle.
 */
export const AdminImageUpload = ({
  label = "Image",
  value = "",
  onChange,
  helperText = "PNG, JPG, WEBP • Max 5MB recommended",
  aspectRatio = "banner", // "banner" | "square" | "auto"
  compact = false,
  className = "",
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInputValue, setUrlInputValue] = useState("");
  const fileInputRef = useRef(null);

  // Handle local file selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Process file into base64 Data URL
  const processFile = (file) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file (PNG, JPG, WEBP, etc.)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result;
      if (onChange) {
        onChange(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // URL fallback apply
  const handleApplyUrl = () => {
    if (urlInputValue.trim() && onChange) {
      onChange(urlInputValue.trim());
      setUrlInputValue("");
      setShowUrlInput(false);
    }
  };

  // Aspect ratio class mapping
  const aspectClass =
    aspectRatio === "square"
      ? "aspect-square max-w-[200px]"
      : aspectRatio === "auto"
      ? "max-h-56"
      : "aspect-[16/7] max-h-52";

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Label and Mode Switcher */}
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-stone-700">
          {label}
        </label>
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-[11px] text-[#173D2A] hover:text-[#0B2416] hover:underline flex items-center gap-1 font-medium transition-colors cursor-pointer"
        >
          <Link2 className="w-3 h-3" />
          <span>{showUrlInput ? "Hide URL input" : "Or paste URL"}</span>
        </button>
      </div>

      {/* Optional Direct URL Input field */}
      {showUrlInput && (
        <div className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl space-y-2 animate-in fade-in duration-200">
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://example.com/image.jpg"
              value={urlInputValue}
              onChange={(e) => setUrlInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleApplyUrl();
                }
              }}
              className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-stone-300 bg-white focus:outline-hidden focus:ring-1 focus:ring-[#173D2A]"
            />
            <button
              type="button"
              onClick={handleApplyUrl}
              className="px-3 py-1.5 bg-[#173D2A] hover:bg-[#0B2416] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-3 h-3" />
              <span>Apply</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Upload / Preview Area */}
      {value ? (
        /* Image Preview Box */
        <div
          className={`relative group rounded-xl overflow-hidden border border-stone-200 bg-stone-100 ${
            compact ? "p-1.5" : "p-2"
          }`}
        >
          <div
            className={`w-full overflow-hidden rounded-lg bg-stone-900/5 flex items-center justify-center ${aspectClass}`}
          >
            <img
              src={value}
              alt={label}
              className="w-full h-full object-cover transition-transform group-hover:scale-[1.02] duration-300"
              onError={(e) => {
                e.target.src =
                  "/images/ProductImages/Ashuwaganda.png";
              }}
            />
          </div>

          {/* Action Overlay */}
          <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5 bg-stone-900/70 backdrop-blur-xs p-1 rounded-lg opacity-90 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2 py-1 bg-white/90 hover:bg-white text-stone-800 text-[11px] font-semibold rounded-md shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
              title="Replace with another file"
            >
              <RefreshCw className="w-3 h-3 text-[#173D2A]" />
              <span>Change</span>
            </button>
            <button
              type="button"
              onClick={() => onChange && onChange("")}
              className="p-1 bg-rose-600/90 hover:bg-rose-600 text-white rounded-md shadow-xs transition-colors cursor-pointer"
              title="Remove image"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        /* Empty Upload Dropzone */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`group flex flex-col items-center justify-center border-2 border-dashed rounded-xl transition-all cursor-pointer text-center ${
            compact ? "p-3" : "p-5"
          } ${
            isDragging
              ? "border-[#173D2A] bg-emerald-50/60 ring-2 ring-[#A9D18E]/50"
              : "border-stone-300 hover:border-[#173D2A] bg-stone-50/70 hover:bg-emerald-50/30"
          }`}
        >
          <div
            className={`rounded-xl bg-white shadow-xs border border-stone-200 flex items-center justify-center text-emerald-800 transition-transform group-hover:scale-105 ${
              compact ? "w-8 h-8 mb-1.5" : "w-10 h-10 mb-2"
            }`}
          >
            <Upload className={compact ? "w-4 h-4" : "w-5 h-5"} />
          </div>

          <span className="text-xs font-semibold text-stone-800 group-hover:text-emerald-900">
            Click to upload or drag & drop
          </span>

          <span className="text-[10px] text-stone-400 mt-0.5">
            {helperText}
          </span>
        </div>
      )}

      {/* Hidden native file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};

