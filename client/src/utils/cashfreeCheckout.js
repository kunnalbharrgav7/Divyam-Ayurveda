/**
 * Opens Cashfree's payment page.
 *
 * Desktop browsers get the pop-up over the page. Phones, and the in-app browsers inside Instagram, Facebook and
 * WhatsApp (where most ad traffic arrives), get a full-page redirect instead: those browsers block or break the
 * pop-up, which is what made payments fail there. After paying, Cashfree sends the customer back to the order
 * confirmation page, which confirms the payment with the server.
 */
const IN_APP_BROWSER = /Instagram|FBAN|FBAV|FB_IAB|FBIOS|Snapchat|Twitter|MicroMessenger|Line\/|WhatsApp/i;
const MOBILE_BROWSER = /Android|iPhone|iPad|iPod|Mobile/i;

export const paymentOpensFullPage = () => {
  if (typeof navigator === "undefined") return false;
  const agent = navigator.userAgent || "";
  return IN_APP_BROWSER.test(agent) || MOBILE_BROWSER.test(agent);
};

/** Where Cashfree should send the customer back to: the same site they are on (with or without "www") */
export const paymentReturnOrigin = () => (typeof window !== "undefined" ? window.location.origin : "");

/**
 * @returns {{ opened: boolean, fullPage: boolean, reason?: string }}
 * With a full-page redirect the page is left for good, so callers must finish their own clean-up first.
 */
export const openCashfree = async ({ paymentSessionId, environment }) => {
  // A test-mode server hands out fake sessions: real Cashfree would reject them
  if (!paymentSessionId || String(paymentSessionId).startsWith("session_mock_")) {
    return { opened: false, fullPage: false, reason: "test-mode" };
  }
  // Loaded only now: importing the package at the top would fetch Cashfree's script on every checkout and
  // confirmation page, even for cash-on-delivery orders that never open a payment page
  const { load } = await import("@cashfreepayments/cashfree-js");
  const cashfree = await load({ mode: environment === "production" ? "production" : "sandbox" });
  const fullPage = paymentOpensFullPage();
  await cashfree.checkout({ paymentSessionId, redirectTarget: fullPage ? "_self" : "_modal" });
  return { opened: true, fullPage };
};
