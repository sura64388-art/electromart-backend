import express from "express";
import {

	getAllProducts, getFeaturedProducts, createProduct, updateProduct, deleteProduct, getRecommendedProducts, getProductsByCategory, toggleFeaturedProduct, getProductById, createProductReview

} from "../controllers/product.controller.js";
import { adminRoute, protectRoute } from "../middleware/auth.middleware.js";
const router = express.Router();

router.get("/", getAllProducts);
router.get("/featured", getFeaturedProducts);
router.get("/recommendations", getRecommendedProducts);
router.get("/category/:category", getProductsByCategory);
router.post("/", protectRoute, adminRoute, createProduct);
router.put("/:id", protectRoute, adminRoute, updateProduct);
router.patch("/:id", protectRoute, adminRoute, toggleFeaturedProduct);
router.delete("/:id", protectRoute, adminRoute, deleteProduct);
router.get("/:id", getProductById);
router.post("/:id/reviews", protectRoute, createProductReview);

export default router;