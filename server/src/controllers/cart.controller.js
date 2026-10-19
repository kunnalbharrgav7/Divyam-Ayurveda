import { cartService } from "../services/cart.service.js";
import { sendSuccess } from "../utils/response.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getActor = (req) => ({
  userId: req.user ? req.user._id : null,
  guestToken: req.headers["x-guest-token"] || null,
});

export const getCart = asyncHandler(async (req, res) => {
  const actor = getActor(req);
  const cart = await cartService.getCartDetails(actor);
  return sendSuccess(res, cart);
});

export const addItem = asyncHandler(async (req, res) => {
  const actor = getActor(req);
  const cart = await cartService.addItem({
    ...actor,
    variantId: req.body.variantId,
    quantity: req.body.quantity || 1,
  });
  return sendSuccess(res, cart);
});

export const updateItem = asyncHandler(async (req, res) => {
  const actor = getActor(req);
  const cart = await cartService.updateItem({
    ...actor,
    variantId: req.body.variantId || req.params.variantId,
    quantity: req.body.quantity,
  });
  return sendSuccess(res, cart);
});

export const removeItem = asyncHandler(async (req, res) => {
  const actor = getActor(req);
  const cart = await cartService.removeItem({
    ...actor,
    variantId: req.params.variantId,
  });
  return sendSuccess(res, cart);
});

export const clearCart = asyncHandler(async (req, res) => {
  const actor = getActor(req);
  const cart = await cartService.clearCart(actor);
  return sendSuccess(res, cart);
});

