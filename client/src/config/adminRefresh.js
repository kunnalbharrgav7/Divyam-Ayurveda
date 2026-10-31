// Fired on window after the header Refresh button has re-fetched the context datasets, so pages that
// keep their own data (reports, a single customer, content pages) can reload it too.
export const ADMIN_REFRESH_EVENT = "divyam:admin-refresh";

// Which AdminContext resources each admin route reads. First match wins; keep specific paths first.
// Product form routes leave "products" out on purpose: the form re-initialises whenever that list
// changes, so a refresh there would overwrite unsaved edits.
const ROUTE_RESOURCES = [
  [/^\/admin\/products\/(new|[^/]+\/edit)$/, ["categories", "brands", "collections", "ingredients"]],
  [/^\/admin\/products$/, ["products"]],
  [/^\/admin\/categories$/, ["categories", "products"]],
  [/^\/admin\/brands$/, ["brands", "products"]],
  [/^\/admin\/collections$/, ["collections", "products"]],
  [/^\/admin\/inventory$/, ["products"]],
  [/^\/admin\/ingredients$/, ["ingredients"]],
  [/^\/admin\/orders(\/[^/]+)?$/, ["orders"]],
  [/^\/admin\/returns-refunds$/, ["returns", "orders"]],
  [/^\/admin\/coupons$/, ["coupons"]],
  [/^\/admin\/customers(\/[^/]+)?$/, ["customers", "orders"]],
  [/^\/admin\/referrals$/, ["referrals"]],
  [/^\/admin\/reviews$/, ["reviews", "products"]],
  [/^\/admin\/content-pages$/, []],
  [/^\/admin\/blog$/, ["blog"]],
  [/^\/admin\/enquiries$/, ["enquiries"]],
  [/^\/admin\/support-tickets$/, ["supportTickets"]],
  [/^\/admin\/subscribers$/, ["subscribers"]],
  [/^\/admin\/reports$/, ["orders"]],
  [/^\/admin\/(users|roles)$/, ["users"]],
  [/^\/admin\/audit-logs$/, ["auditLogs"]],
  [/^\/admin\/settings$/, ["settings"]],
  [/^\/admin(\/dashboard)?$/, ["orders", "products", "customers", "reviews", "supportTickets"]],
];

export const refreshKeysForPath = (pathname) => {
  const path = pathname.replace(/\/+$/, "") || "/";
  const match = ROUTE_RESOURCES.find(([pattern]) => pattern.test(path));
  return match ? match[1] : [];
};
