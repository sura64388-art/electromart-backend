import express from "express";
import {
  getUserOrders,
  getOrderById,
  updateOrderStatus,
  getAllOrdersAdmin,
  createOrder,
  initiatePayment,
  verifyPayment,
} from "../controllers/order.controller.js";
import { refundOrder } from "../controllers/refund.controller.js";
import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";
const router = express.Router();
router.get("/", protectRoute, adminRoute, getAllOrdersAdmin);
router.put("/:id/status", protectRoute, adminRoute, updateOrderStatus);
router.post("/:id/refund", protectRoute, adminRoute, refundOrder);
router.get("/my-orders", protectRoute, getUserOrders);
router.get("/:id", protectRoute, getOrderById);
router.post("/createOrder", protectRoute, createOrder);
router.post("/checkout", protectRoute, createOrder);
router.post("/payment/initiate", protectRoute, initiatePayment);
router.post("/payment/verify", protectRoute, verifyPayment);

export default router;
