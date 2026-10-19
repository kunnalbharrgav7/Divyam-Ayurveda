import { returnService } from "../services/return.service.js";
import { RETURN_REASONS, RETURN_WINDOW_DAYS } from "../constants/returnReasons.js";
import { sendSuccess } from "../utils/response.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// ---- Customer ----
export const getReturnOptions = asyncHandler(async (req, res) => {
  const reasons = Object.entries(RETURN_REASONS).map(([key, r]) => ({
    key,
    label: r.label,
    photoRequired: r.photo,
    opened: r.opened,
  }));
  return sendSuccess(res, { windowDays: RETURN_WINDOW_DAYS, reasons });
});

export const getEligibilityMap = asyncHandler(async (req, res) => sendSuccess(res, await returnService.eligibilityMap(req.user)));

export const getEligibility = asyncHandler(async (req, res) =>
  sendSuccess(res, await returnService.getEligibility(req.params.orderNumber, req.user))
);

export const createReturn = asyncHandler(async (req, res) =>
  sendSuccess(res, await returnService.createReturn(req.params.orderNumber, req.user, req.body), undefined, 201)
);

export const listMyReturns = asyncHandler(async (req, res) => sendSuccess(res, await returnService.listMine(req.user)));

export const getMyReturn = asyncHandler(async (req, res) => sendSuccess(res, await returnService.getMine(req.params.id, req.user)));

export const cancelMyReturn = asyncHandler(async (req, res) => sendSuccess(res, await returnService.cancelMine(req.params.id, req.user)));

export const getStoreCredit = asyncHandler(async (req, res) =>
  sendSuccess(res, { storeCredit: Number(((req.user.storeCreditPaise || 0) / 100).toFixed(2)) })
);

// ---- Admin ----
export const listAdminReturns = asyncHandler(async (req, res) => sendSuccess(res, await returnService.listAdmin(req.query)));
export const getAdminReturn = asyncHandler(async (req, res) => sendSuccess(res, await returnService.getAdmin(req.params.id)));
export const approveReturn = asyncHandler(async (req, res) => sendSuccess(res, await returnService.approve(req.params.id, req.user, req.body)));
export const rejectReturn = asyncHandler(async (req, res) => sendSuccess(res, await returnService.reject(req.params.id, req.user, req.body)));
export const receiveReturn = asyncHandler(async (req, res) => sendSuccess(res, await returnService.markReceived(req.params.id, req.user, req.body)));
export const refundReturn = asyncHandler(async (req, res) => sendSuccess(res, await returnService.issueRefund(req.params.id, req.user, req.body)));
export const refreshReturnRefund = asyncHandler(async (req, res) => sendSuccess(res, await returnService.refreshRefund(req.params.id, req.user)));
