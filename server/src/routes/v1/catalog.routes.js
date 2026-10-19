import { Router } from "express";
import * as catalogController from "../../controllers/catalog.controller.js";
import * as orderController from "../../controllers/order.controller.js";
import { cacheMiddleware } from "../../middleware/cache.js";
import { authenticate } from "../../middleware/auth.js";

const router = Router();

// Products
router.get("/products", cacheMiddleware(60, "catalog"), catalogController.getProducts);
// Live stock for cart/wishlist items: deliberately not cached, and declared before /products/:slug
router.get("/products/stock", catalogController.getProductsStock);
// Product photos stored as data URLs are served as cacheable image bytes
router.get("/products/:id/images/:index", catalogController.getProductImage);
router.get("/products/:slug", cacheMiddleware(120, "catalog"), catalogController.getProductBySlug);
router.get("/products/:slug/related", cacheMiddleware(120, "catalog"), catalogController.getRelatedProducts);
router.post("/products/:productId/reviews", authenticate, orderController.submitReview);

// Categories
router.get("/categories", cacheMiddleware(300, "taxonomy"), catalogController.getCategories);
router.get("/categories/:slug", cacheMiddleware(300, "taxonomy"), catalogController.getCategoryBySlug);

// Brands, Collections, Ingredients
router.get("/brands", cacheMiddleware(300, "taxonomy"), catalogController.getBrands);
router.get("/collections", cacheMiddleware(300, "taxonomy"), catalogController.getCollections);
router.get("/ingredients", cacheMiddleware(300, "taxonomy"), catalogController.getIngredients);

export default router;

