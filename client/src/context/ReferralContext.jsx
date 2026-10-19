/**
 * Referral context: the visitor's invitation (from ?ref=CODE), the signed-in customer's referral
 * dashboard, and sharing helpers. Rules and numbers always come from the API.
 */
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import {
  DEFAULT_PROGRAM,
  getReferralShareUrl,
  describeFriendOffer,
  getStoredAttribution,
  storeAttribution,
  clearAttribution,
  lookupReferralCode,
} from "../services/referralService";

const ReferralContext = createContext(null);
const POLL_MS = 30000;

const EMPTY_DASHBOARD = {
  referralCode: "",
  shareUrl: "",
  stats: { invited: 0, ordered: 0, rewarded: 0, pendingRewards: 0, totalEarned: 0, walletBalance: 0 },
  tier: { name: "Prana Silver", nextTier: null },
  referrals: [],
};

export const ReferralProvider = ({ children }) => {
  const { user, authFetch, hasBackendSession } = useAuth();
  const location = useLocation();

  const [program, setProgram] = useState(DEFAULT_PROGRAM);
  const [activeAttribution, setActiveAttribution] = useState(() => getStoredAttribution());
  const [bannerAlert, setBannerAlert] = useState(null);
  const [dashboardData, setDashboardData] = useState(EMPTY_DASHBOARD);
  const [dashboardLoaded, setDashboardLoaded] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState({ code: false, link: false });

  const fetchRef = useRef(authFetch);
  fetchRef.current = authFetch;

  // Open ?ref=CODE links: check the code with the server, remember it, and show the offer
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const refCode = (params.get("ref") || params.get("referral") || "").trim();
    if (!refCode) return undefined;
    let cancelled = false;
    lookupReferralCode(refCode).then((res) => {
      if (cancelled) return;
      if (res.valid) {
        setProgram((p) => ({ ...p, ...res.program }));
        setActiveAttribution(storeAttribution(res.code));
        setBannerAlert({
          show: true,
          code: res.code,
          referrerName: res.referrerName,
          offer: describeFriendOffer(res.program),
          discountValue: res.program.refereeDiscountValue,
          discountType: res.program.refereeDiscountType,
          minOrderValue: res.program.minOrderValue,
        });
      } else {
        setBannerAlert({ show: true, isInvalid: true, reason: res.reason });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [location.search]);

  // The saved invitation can change from elsewhere (e.g. a code typed at signup)
  useEffect(() => {
    const sync = () => setActiveAttribution(getStoredAttribution());
    window.addEventListener("divyam_referral_attribution", sync);
    return () => window.removeEventListener("divyam_referral_attribution", sync);
  }, []);

  // A code typed in by hand (checkout box): verify it with the server, then keep it like a link would
  const applyReferralCode = useCallback(async (code) => {
    const clean = String(code || "").trim();
    if (!clean) return { valid: false, reason: "Enter a referral code." };
    const res = await lookupReferralCode(clean);
    if (res.valid) {
      setProgram((p) => ({ ...p, ...res.program }));
      storeAttribution(res.code);
    }
    return res;
  }, []);

  const refreshDashboard = useCallback(async () => {
    try {
      const res = await fetchRef.current("/api/v1/referrals/me");
      if (!res.ok) return;
      const json = await res.json();
      if (json.success && json.data) {
        setDashboardData(json.data);
        setProgram((p) => ({ ...p, ...json.data.program }));
        setDashboardLoaded(true);
      }
    } catch (_) {}
  }, []);

  // The customer's own dashboard: load on sign-in, keep fresh while the tab is open, clear on sign-out
  const session = hasBackendSession ? user?.id : null;
  useEffect(() => {
    if (!session) {
      setDashboardData(EMPTY_DASHBOARD);
      setDashboardLoaded(false);
      return undefined;
    }
    refreshDashboard();
    const tick = () => document.visibilityState === "visible" && refreshDashboard();
    const timer = setInterval(tick, POLL_MS);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", tick);
    };
  }, [session]);

  // What the active invitation is worth on a basket (the server decides; checkout re-checks the order itself)
  const previewDiscount = useCallback(async (code, goodsAmount) => {
    try {
      const res = await fetchRef.current("/api/v1/referrals/preview", {
        method: "POST",
        body: JSON.stringify({ code, goodsAmount }),
      });
      const json = await res.json();
      return json?.data || { valid: false, reason: "Could not check the referral code." };
    } catch (_) {
      return { valid: false, reason: "Could not check the referral code." };
    }
  }, []);

  const clearInvitation = () => {
    clearAttribution();
    setActiveAttribution(null);
  };

  const copyToClipboard = async (text, type = "link") => {
    if (!text) return false;
    let success = false;
    try {
      if (!navigator?.clipboard?.writeText) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(text);
      success = true;
    } catch {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        success = document.execCommand("copy");
        document.body.removeChild(textarea);
      } catch (err) {
        console.error("Clipboard copy failed:", err);
      }
    }
    if (success) {
      setCopyFeedback((prev) => ({ ...prev, [type]: true }));
      setTimeout(() => setCopyFeedback((prev) => ({ ...prev, [type]: false })), 2500);
    }
    return success;
  };

  const offer = describeFriendOffer(program);
  const shareViaWhatsApp = (code, url) => {
    const text = `🌿 I'm inviting you to experience authentic Ayurvedic wellness with Divyam Ayurveda! Use my referral code *${code}* or tap this link to get ${offer} on your first order:\n${url}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  const shareViaEmail = (code, url) => {
    const subject = encodeURIComponent(`${offer} your first authentic Ayurvedic order from Divyam Ayurveda`);
    const body = encodeURIComponent(
      `Namaste,\n\nI thought you would love Divyam Ayurveda's pure Himalayan Shilajit, single-origin herbs, and classical churnas.\n\nUse my personal referral code "${code}" or click the invitation link below to receive ${offer} on your first purchase:\n${url}\n\nLive Naturally, Live Better.\nDivyam Ayurveda Wellness`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const shareNative = async (code, url) => {
    if (!navigator?.share) return false;
    try {
      await navigator.share({
        title: "Divyam Ayurveda — Refer & Earn Invitation",
        text: `Use my code ${code} for ${offer} authentic Ayurvedic wellness formulations:`,
        url,
      });
      return true;
    } catch (err) {
      if (err.name !== "AbortError") console.error("Native share failed:", err);
      return false;
    }
  };

  return (
    <ReferralContext.Provider
      value={{
        settings: program,
        activeAttribution,
        bannerAlert,
        dashboardData,
        dashboardLoaded,
        copyFeedback,
        copyToClipboard,
        shareViaWhatsApp,
        shareViaEmail,
        shareNative,
        dismissBanner: () => setBannerAlert(null),
        clearAttribution: clearInvitation,
        previewDiscount,
        applyReferralCode,
        refreshDashboard,
        getShareUrl: getReferralShareUrl,
      }}
    >
      {children}
    </ReferralContext.Provider>
  );
};

export const useReferrals = () => {
  const context = useContext(ReferralContext);
  if (!context) throw new Error("useReferrals must be used within a ReferralProvider");
  return context;
};
