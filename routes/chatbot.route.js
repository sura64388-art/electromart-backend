import express from "express";
import { getChatResponse } from "../controllers/chatbot.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// You can choose to protect this route or leave it public
// router.post("/", protectRoute, getChatResponse);
router.post("/", getChatResponse);

export default router;
