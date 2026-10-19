import { catalogService } from "../services/catalog.service.js";
import { sendSuccess } from "../utils/response.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Product } from "../models/Product.js";
import { parseDataUrl } from "../utils/productImages.js";

export const getProducts = asyncHandler(async (req, res) => {
  const result = await catalogService.getProducts(req.query);
  return sendSuccess(res, result.products, {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
    hasMore: result.hasMore,
  });
});

export const getProductsStock = asyncHandler(async (req, res) => {
  const ids = String(req.query.ids || "").split(",").map((id) => id.trim()).filter(Boolean);
  const stock = await catalogService.getStockByIds(ids);
  return sendSuccess(res, stock);
});

export const getProductImage = asyncHandler(async (req, res) => {
  const { id, index } = req.params;
  const product = /^[a-f0-9]{24}$/i.test(id) ? await Product.findById(id).select("images").lean() : null;
  const image = product?.images?.[Number(index)];
  if (!image) {
    return res.status(404).json({ success: false, error: { message: "Image not found" } });
  }

  const parsed = parseDataUrl(image);
  if (!parsed) return res.redirect(302, image); // already a normal URL

  // The URL carries a ?v=<updatedAt> version, so the bytes for a given URL never change
  res.setHeader("Content-Type", parsed.contentType);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  return res.send(parsed.buffer);
});

export const getProductBySlug = asyncHandler(async (req, res) => {
  const product = await catalogService.getProductBySlug(req.params.slug);
  if (!product) {
    return res.status(404).json({ success: false, error: { message: "Product not found" } });
  }
  return sendSuccess(res, product);
});

export const getRelatedProducts = asyncHandler(async (req, res) => {
  const products = await catalogService.getRelatedProducts(req.params.slug);
  return sendSuccess(res, products);
});

export const getCategories = asyncHandler(async (req, res) => {
  const categories = await catalogService.getCategories();
  return sendSuccess(res, categories);
});

export const getCategoryBySlug = asyncHandler(async (req, res) => {
  const category = await catalogService.getCategoryBySlug(req.params.slug);
  return sendSuccess(res, category);
});

export const getBrands = asyncHandler(async (req, res) => {
  const brands = await catalogService.getBrands();
  return sendSuccess(res, brands);
});

export const getCollections = asyncHandler(async (req, res) => {
  const collections = await catalogService.getCollections();
  return sendSuccess(res, collections);
});

export const getIngredients = asyncHandler(async (req, res) => {
  const ingredients = await catalogService.getIngredients();
  return sendSuccess(res, ingredients);
});

