import express from "express";

import {
  createRequirement,
  getRequirements,
  getRequirement,
  analyzeCandidate,
  getAnalyses,
  getAnalysis,
  updateCandidateStatus,
  deleteCandidate,
} from "../../Controllers/admin/recruitmentController.js";
import { recruitmentUpload } from "../../Middleware/recruitmentUpload.js";
import { verifyToken } from "../../Middleware/authmiddleware.js";

const router = express.Router();

function requireRecruitmentAccess(req, res, next) {
  const role = typeof req.user?.role === "object"
    ? req.user.role?.name
    : req.user?.role;

  if (
    ["admin", "hr"].includes(String(role || "").toLowerCase()) ||
    req.user?.permissions?.includes("recruitment.manage") ||
    req.user?.permissions?.includes("all:access")
  ) {
    return next();
  }

  return res.status(403).json({
    message: "HR or administrative access is required for recruitment.",
  });
}

function uploadResume(req, res, next) {
  recruitmentUpload.fields([
    { name: "resumes", maxCount: 10 },
    { name: "resume", maxCount: 10 },
  ])(req, res, (error) => {
    if (!error) return next();
    const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    return res.status(status).json({
      message: error.message || "Could not process the uploaded resume.",
    });
  });
}

const protect = [verifyToken, requireRecruitmentAccess];

router.post("/requirements", ...protect, createRequirement);
router.get("/requirements", ...protect, getRequirements);
router.get("/requirements/:id", ...protect, getRequirement);
router.post("/analyze", ...protect, uploadResume, analyzeCandidate);
router.get("/analyses", ...protect, getAnalyses);
router.get("/analyses/:id", ...protect, getAnalysis);
router.patch("/candidates/:id/status", ...protect, updateCandidateStatus);
router.delete("/candidates/:id", ...protect, deleteCandidate);

export default router;