import React from "react";
import { AlertTriangle, RefreshCw, Home, LayoutDashboard } from "lucide-react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("ErrorBoundary caught an uncaught runtime error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMessage =
        this.state.error?.message ||
        (typeof this.state.error === "string" ? this.state.error : "An unexpected error occurred.");

      return (
        <div className="min-h-screen bg-[#F7F8F4] flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-white rounded-3xl border border-stone-200/80 p-8 sm:p-10 shadow-lg text-center">
            {/* Brand Logo / Header */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-[#173D2A] mb-6">
              <span className="w-2 h-2 rounded-full bg-[#386B40] animate-pulse" />
              Divyam Ayurveda System Recovery
            </div>

            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/60 mx-auto flex items-center justify-center mb-5">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold font-heading tracking-tight text-stone-900 tracking-tight mb-2">
              Something went wrong
            </h1>
            <p className="text-sm text-stone-600 mb-6 max-w-md mx-auto leading-relaxed">
              We encountered an unexpected error while rendering this page. You can reload the application or return to a safe page.
            </p>

            {/* Error Message Box */}
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 mb-6 text-left overflow-x-auto text-xs font-mono text-stone-700">
              <span className="font-bold text-rose-700 block mb-1">Error Diagnostic:</span>
              <p className="break-all">{errorMessage}</p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#173D2A] text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-[#0B2416] transition-colors shadow-xs"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Application</span>
              </button>

              <a
                href="/admin"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs sm:text-sm font-semibold transition-colors"
              >
                <LayoutDashboard className="w-4 h-4 text-stone-500" />
                <span>Admin Dashboard</span>
              </a>

              <a
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-stone-300 hover:bg-stone-50 text-stone-700 rounded-xl text-xs sm:text-sm font-semibold transition-colors"
              >
                <Home className="w-4 h-4 text-stone-500" />
                <span>Store Home</span>
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

