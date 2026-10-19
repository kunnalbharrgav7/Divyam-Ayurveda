import { referralService } from "../services/referral.service.js";
import { walletService } from "../services/wallet.service.js";
import { ApiError } from "../utils/apiError.js";
import { toPaise } from "../utils/currency.js";
import { sendSuccess } from "../utils/response.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Public: is this a real code, who invited me, what's the offer? (landing page and banner)
export const lookupCode = asyncHandler(async (req, res) => sendSuccess(res, await referralService.lookupCode(req.params.code)));

// Signed in: my code, share link, stats, friends and wallet
export const getMyReferral = asyncHandler(async (req, res) => sendSuccess(res, await referralService.dashboard(req.user)));

// What would this code save on a basket? Informational: the order itself is always re-checked on the server.
export const previewDiscount = asyncHandler(async (req, res) => {
  const goodsPaise = toPaise(Number(req.body?.goodsAmount || 0));
  if (goodsPaise <= 0) throw ApiError.badRequest("A basket amount is required.");
  try {
    const result = await referralService.computeDiscount({ code: req.body?.code, user: req.user || null, goodsPaise });
    return sendSuccess(res, { valid: true, code: result.code, referrerName: result.referrerName, discount: result.discount });
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 400) return sendSuccess(res, { valid: false, reason: err.message });
    throw err;
  }
});

export const getMyWallet = asyncHandler(async (req, res) =>
  sendSuccess(res, {
    balance: Number(((await walletService.balance(req.user._id)) / 100).toFixed(2)),
    transactions: await walletService.history(req.user._id),
  })
);
