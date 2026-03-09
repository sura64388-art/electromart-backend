import express from "express";
import { createContact, getMyContacts, getAllContacts, deleteContact } from "../controllers/contact.controller.js";
import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", protectRoute, createContact);
router.get("/my", protectRoute, getMyContacts);
router.get("/", protectRoute, adminRoute, getAllContacts);
router.delete("/:id", protectRoute, adminRoute, deleteContact);

export default router;