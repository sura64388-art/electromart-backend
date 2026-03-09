import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { createCheckoutOrder, verifyPayment } from "../controllers/payment.controller.js";

const router = express.Router();

router.post("/create-checkout-session", protectRoute, createCheckoutOrder);
router.post("/checkout-success", protectRoute, verifyPayment);

export default router;
