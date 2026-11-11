// Backend/Routes/admin/resumeRoutes.js
// Resume upload and batch screening endpoints. Admin-only access required.
import express from "express";
import multer from "multer";
import mammoth from "mammoth";
import fs from "fs";
import crypto from "crypto";
import path from "path";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { verifyToken, requirePermission, requireActiveModule } from "../../Middleware/authmiddleware.js";
import AuditLog from "../../Models/AuditLog.js";

const router = express.Router();
router.use(requireActiveModule("recruitment"));

// Upload folder for temporary resume storage
const uploadDir = "uploads/tmp_resumes";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer disk storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    allowed.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Only PDF and DOCX files are allowed."));
  },
});

// Extract text from a PDF file buffer
async function extractPdfText(filePath) {
  const data = new Uint8Array(fs.readFileSync(filePath));
  const loadingTask = pdfjsLib.getDocument({ data, useSystemFonts: true });
  const pdf = await loadingTask.promise;
  let text = "";

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    text += content.items.map((item) => item.str).join(" ") + "\n";
  }
  return text;
}

// Extract text from a DOCX file buffer
async function extractDocxText(filePath) {
  const buffer = fs.readFileSync(filePath);
  const result = await mammoth.extractRawText({ buffer });
  return result.value || "";
}

// Extract the first email address found in text (case-insensitive domain)
function extractEmail(text) {
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi);
  return match ? match[0] : "";
}

// Extract the first Indian mobile number found in text
function extractPhone(text) {
  const match = text.match(/(\+91[\s-]?)?[6-9]\d{9}/);
  return match ? match[0] : "";
}

// Guess candidate name from the file name (strips extension)
function guessCandidateName(fileName) {
  return fileName.replace(/\.[^/.]+$/, "");
}

// Skill dictionary for ATS keyword matching
const skillDictionary = [
  "javascript",
  "typescript",
  "react",
  "nextjs",
  "redux",
  "html",
  "css",
  "bootstrap",
  "tailwind",
  "sass",
  "node",
  "express",
  "mongodb",
  "mysql",
  "postgresql",
  "firebase",
  "java",
  "python",
  "c",
  "c++",
  "c#",
  "php",
  "laravel",
  "spring",
  "springboot",
  "docker",
  "kubernetes",
  "git",
  "github",
  "linux",
  "aws",
  "azure",
  "gcp",
  "figma",
  "postman",
  "rest",
  "graphql",
  "socket",
  "jwt",
  "oauth",
  "redis",
  "nginx",
  "vite",
  "webpack",
];

// Parse skills from resume text by matching against the skill dictionary
function extractSkills(text) {
  const lower = text.toLowerCase();
  return skillDictionary.filter((skill) => lower.includes(skill));
}

// Extract experience description from text
function extractExperience(text) {
  const match = text.match(/(\d+)\+?\s*(years?|yrs?)\s*(of)?\s*experience/i);
  return match ? match[0] : "Not Mentioned";
}

// Extract education keywords from text
function extractEducation(text) {
  const keywords = [
    "B.E",
    "B.Tech",
    "M.E",
    "M.Tech",
    "BCA",
    "MCA",
    "B.Sc",
    "M.Sc",
    "Engineering",
    "Computer Science",
    "Information Technology",
  ];
  const found = keywords.filter((k) =>
    text.toLowerCase().includes(k.toLowerCase()),
  );
  return [...new Set(found)];
}

// ATS keyword matching — compares resume text against job description keywords
function processLocalMatch(resumeText, jobKeywords) {
  if (!resumeText.trim()) {
    return {
      matchScore: 0,
      matchedKeywords: [],
      missingKeywords: [...jobKeywords],
    };
  }

  const resumeWords = resumeText
    .toLowerCase()
    .replace(/[^a-z0-9#+\s]/g, " ")
    .split(/\s+/);

  const resumeSet = new Set(resumeWords);
  const matchedKeywords = [...jobKeywords].filter((w) => resumeSet.has(w));
  const missingKeywords = [...jobKeywords].filter((w) => !resumeSet.has(w));
  const matchScore = Math.round(
    (matchedKeywords.length / jobKeywords.size) * 100,
  );

  return { matchScore, matchedKeywords, missingKeywords };
}

// Safely delete temporary uploaded files
function cleanup(files = []) {
  files.forEach((f) => {
    try {
      if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
    } catch (_) {}
  });
}

// POST /batch-screen — Permission-protected bulk resume screening
router.post(
  "/batch-screen",
  verifyToken,
  requirePermission("recruitment.manage"),
  upload.array("resumes", 50),
  async (req, res) => {
    const files = req.files || [];

    try {
      const { jobDescription } = req.body;

      if (!jobDescription?.trim()) {
        cleanup(files);
        return res
          .status(400)
          .json({ success: false, message: "Job description is required." });
      }

      if (files.length === 0) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Please upload at least one resume.",
          });
      }

      // Build job keyword set from the job description
      const stopWords = new Set([
        "the", "and", "for", "with", "this", "that", "are",
        "will", "have", "from", "your", "our", "not", "can",
        "into", "using", "able", "has", "had", "been", "was",
        "were", "their", "they", "them", "its", "his", "her",
        "who", "all", "any", "each", "other",
      ]);

      const jobKeywords = new Set(
        jobDescription
          .toLowerCase()
          .replace(/[^a-z0-9#+\s]/g, " ")
          .split(/\s+/)
          .filter((w) => w.length > 2 && !stopWords.has(w)),
      );

      // Process all resumes in parallel
      const leaderboard = await Promise.all(
        files.map(async (file) => {
          let extractedText = "";
          try {
            if (file.originalname.toLowerCase().endsWith(".pdf")) {
              extractedText = await extractPdfText(file.path);
            } else if (file.originalname.toLowerCase().endsWith(".docx")) {
              extractedText = await extractDocxText(file.path);
            }

            const analysis = processLocalMatch(extractedText, jobKeywords);

            return {
              candidateName: guessCandidateName(file.originalname),
              email: extractEmail(extractedText),
              phone: extractPhone(extractedText),
              experience: extractExperience(extractedText),
              education: extractEducation(extractedText),
              skills: extractSkills(extractedText),
              resumeLength: extractedText.length,
              fileName: file.originalname,
              ...analysis,
            };
          } catch (err) {
            console.error("Resume Error:", file.originalname, err.message);
            return {
              candidateName: file.originalname,
              fileName: file.originalname,
              matchScore: 0,
              matchedKeywords: [],
              missingKeywords: [...jobKeywords],
              skills: [],
              education: [],
              email: "",
              phone: "",
              experience: "Not Mentioned",
              resumeLength: 0,
              error: err.message,
            };
          }
        }),
      );

      // Cleanup temp files
      cleanup(files);

      // Sort by match score descending
      leaderboard.sort((a, b) => b.matchScore - a.matchScore);

      // Audit log
      await AuditLog.create({
        adminId: req.user._id,
        adminName: req.user.name,
        action: "RESUME_BATCH_SCREEN",
        details: `Screened ${leaderboard.length} resume(s) against job description`,
        module: "Recruitment",
        severity: "info",
        ipAddress: req.headers["x-forwarded-for"] || req.ip,
      });

      return res.json({
        success: true,
        totalCandidates: leaderboard.length,
        jobKeywordCount: jobKeywords.size,
        leaderboard,
      });
    } catch (err) {
      cleanup(files);
      console.error("Batch screen error:", err);
      return res.status(500).json({
        success: false,
        message: "Internal Server Error",
        error: err.message,
      });
    }
  },
);

export default router;
