import express from "express";
import { adminRoute, protectRoute } from "../middleware/auth.middleware.js";
import { getAllCustomers, deleteCustomer } from "../controllers/user.controller.js";

const router = express.Router();

router.get("/", protectRoute, adminRoute, getAllCustomers);
router.delete("/:id", protectRoute, adminRoute, deleteCustomer);

export default router;
