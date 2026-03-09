import express from "express";
const router = express.Router();

import {
	login,
	signup,
	logout,
	refreshToken,
	getProfile,
	updateProfile,
	updatePassword,
	sendOTP,
	resetPasswordWithOTP, 
	ADMIN,
	updateAddress,
} from "../controllers/auth.controller.js";

import { protectRoute } from "../middleware/auth.middleware.js";

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

router.get("/profile", protectRoute, getProfile);
router.put("/profile", protectRoute, updateProfile);
router.put("/address", protectRoute, updateAddress);

router.put("/change-password", protectRoute, updatePassword);

router.post("/refresh-token", refreshToken);
router.post("/send-otp", sendOTP);
router.post("/reset-password-with-otp", resetPasswordWithOTP);
// Optional admin seed
router.post("/user/admin", ADMIN);

export default router;