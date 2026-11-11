import express from "express";

import {
  getMyProfile,
  updateMyProfile,
} from "../../Controllers/profileController.js";

import { verifyToken } from "../../Middleware/authmiddleware.js";

const router = express.Router();

// Current logged-in user's profile
router.get("/me", verifyToken, getMyProfile);

// Update current logged-in user's profile
router.patch("/me", verifyToken, updateMyProfile);

export default router;