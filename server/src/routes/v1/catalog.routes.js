import { Router } from "express";
import * as catalogController from "../../controllers/catalog.controller.js";
import * as orderController from "../../controllers/order.controller.js";
import { authenticate } from "../../middleware/auth.js";

const router = Router();

// Products
router.get("/products", catalogController.getProducts);
// Live stock for cart/wishlist items: deliberately not cached, and declared before /products/:slug
router.get("/products/stock", catalogController.getProductsStock);
// Product photos stored as data URLs are served as cacheable image bytes
router.get("/products/:id/images/:index", catalogController.getProductImage);
router.get("/products/:slug", catalogController.getProductBySlug);
router.get("/products/:slug/related", catalogController.getRelatedProducts);
router.post("/products/:productId/reviews", authenticate, orderController.submitReview);

// Categories
router.get("/categories", catalogController.getCategories);
router.get("/categories/:slug", catalogController.getCategoryBySlug);

// Brands, Collections, Ingredients
router.get("/brands", catalogController.getBrands);
router.get("/collections", catalogController.getCollections);
router.get("/ingredients", catalogController.getIngredients);

export default router;

