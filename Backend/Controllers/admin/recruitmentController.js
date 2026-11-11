import fs from "node:fs/promises";
import mongoose from "mongoose";

import RecruitmentRequirement from "../../Models/RecruitmentRequirement.js";
import RecruitmentCandidate from "../../Models/RecruitmentCandidate.js";
import ResumeAnalysis from "../../Models/ResumeAnalysis.js";
import { extractResumeText } from "../../Services/resumeParser.js";
import { analyzeResumeWithGemini } from "../../Services/geminiRecruitmentService.js";
import { calculateRecruitmentScore } from "../../Services/recruitmentScoring.js";

const candidateStatuses = [
  "New",
  "Shortlisted",
  "Interview",
  "Rejected",
  "Hired",
];

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parseList(value) {
  const values = Array.isArray(value) ? value : [value];
  return values
    .flatMap((item) => typeof item === "string" ? item.split(/[,;\n]/) : [])
    .map((item) => item.trim())
    .filter(Boolean);
}

function getAnalysisErrorMessage(error) {
  if (error?.message?.includes("GEMINI_API_KEY")) {
    return "Gemini is not configured on the server. Set GEMINI_API_KEY in Backend/.env.";
  }

  if (error?.status === 401 || error?.status === 403) {
    return "Gemini rejected the backend API key. Check GEMINI_API_KEY in Backend/.env.";
  }

  if (error?.status === 429) {
    return "Gemini quota or rate limit reached. Check the Google AI project quota and try again.";
  }

  return "Gemini resume analysis failed. Please try again.";
}

export async function createRequirement(req, res) {
  try {
    const body = req.body || {};
    const jobTitle = cleanString(body.jobTitle);
    const minimumExperienceYears = Number(body.minimumExperienceYears || 0);

    if (!jobTitle) {
      return res.status(400).json({ message: "Job title is required." });
    }

    if (!Number.isFinite(minimumExperienceYears) || minimumExperienceYears < 0) {
      return res.status(400).json({
        message: "Minimum experience must be a non-negative number.",
      });
    }

    const requirement = await RecruitmentRequirement.create({
      jobTitle,
      department: cleanString(body.department),
      designation: cleanString(body.designation),
      requiredSkills: parseList(body.requiredSkills),
      preferredSkills: parseList(body.preferredSkills),
      minimumExperienceYears,
      education: cleanString(body.education),
      responsibilities: parseList(body.responsibilities),
      additionalRequirements: parseList(body.additionalRequirements),
      location: cleanString(body.location),
      employmentType: body.employmentType || "Full Time",
      status: body.status === "Draft" ? "Draft" : "Open",
      createdBy: req.user._id,
    });

    return res.status(201).json({
      message: "Recruitment requirement created.",
      requirement,
    });
  } catch (error) {
    console.error("createRequirement failed:", error.message);
    return res.status(500).json({ message: "Failed to create recruitment requirement." });
  }
}

export async function getRequirements(req, res) {
  try {
    const requirements = await RecruitmentRequirement.find()
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });
    return res.json(requirements);
  } catch (error) {
    console.error("getRequirements failed:", error.message);
    return res.status(500).json({ message: "Failed to load recruitment requirements." });
  }
}

export async function getRequirement(req, res) {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid requirement ID." });
  }

  try {
    const requirement = await RecruitmentRequirement.findById(req.params.id);
    if (!requirement) {
      return res.status(404).json({ message: "Recruitment requirement not found." });
    }
    return res.json(requirement);
  } catch (error) {
    console.error("getRequirement failed:", error.message);
    return res.status(500).json({ message: "Failed to load recruitment requirement." });
  }
}

async function analyzeResumeFile(file, requirement, createdBy) {
  let candidateId;

  try {
    let resumeText;
    try {
      resumeText = (await extractResumeText(file.path, file.mimetype)).slice(0, 50000);
    } catch (error) {
      return {
        fileName: file.originalname,
        success: false,
        message: error.message || "Could not read the resume.",
      };
    }

    let aiAnalysis;
    try {
      aiAnalysis = await analyzeResumeWithGemini({
        resumeText,
        requirements: {
          jobTitle: requirement.jobTitle,
          department: requirement.department,
          designation: requirement.designation,
          requiredSkills: requirement.requiredSkills,
          preferredSkills: requirement.preferredSkills,
          minimumExperienceYears: requirement.minimumExperienceYears,
          education: requirement.education,
          responsibilities: requirement.responsibilities,
          additionalRequirements: requirement.additionalRequirements,
          location: requirement.location,
          employmentType: requirement.employmentType,
        },
      });
    } catch (error) {
      console.error("Gemini recruitment analysis failed:", {
        fileName: file.originalname,
        status: error?.status,
        code: error?.code,
      });
      return {
        fileName: file.originalname,
        success: false,
        message: getAnalysisErrorMessage(error),
      };
    }

    const educationMatch = !requirement.education || aiAnalysis.education.match;
    const score = calculateRecruitmentScore({
      requirement,
      analysis: {
        ...aiAnalysis,
        education: { ...aiAnalysis.education, match: educationMatch },
      },
      resumeText,
    });

    const candidate = await RecruitmentCandidate.create({
      name: aiAnalysis.candidate.name || "Unknown",
      email: aiAnalysis.candidate.email,
      phone: aiAnalysis.candidate.phone,
      resumeFileName: file.originalname,
      resumeMimeType: file.mimetype,
      resumeText,
      createdBy,
    });
    candidateId = candidate._id;

    let analysis;
    try {
      analysis = await ResumeAnalysis.create({
        candidateId: candidate._id,
        requirementId: requirement._id,
        overallMatch: score.overallMatch,
        recommendation: score.recommendation,
        confidence: aiAnalysis.confidence,
        skills: aiAnalysis.skills,
        experience: {
          candidateYears: aiAnalysis.experience.candidateYears,
          requiredYears: requirement.minimumExperienceYears,
          match: aiAnalysis.experience.candidateYears >= requirement.minimumExperienceYears,
          evidence: aiAnalysis.experience.evidence,
        },
        education: {
          candidate: aiAnalysis.education.candidate,
          required: requirement.education,
          match: educationMatch,
          evidence: aiAnalysis.education.evidence,
        },
        responsibilities: aiAnalysis.responsibilities,
        strengths: aiAnalysis.strengths,
        gaps: aiAnalysis.gaps,
        projects: aiAnalysis.projects,
        summary: aiAnalysis.summary,
        recommendationReason: aiAnalysis.reasoning,
        analyzedModel: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
      });
    } catch (error) {
      await RecruitmentCandidate.deleteOne({ _id: candidate._id });
      candidateId = null;
      throw error;
    }

    return {
      fileName: file.originalname,
      success: true,
      candidate,
      analysis,
      scoring: score,
    };
  } catch (error) {
    if (candidateId) {
      await RecruitmentCandidate.deleteOne({ _id: candidateId }).catch(() => {});
    }
    console.error("Resume analysis failed:", {
      fileName: file.originalname,
      status: error?.status,
      code: error?.code,
    });
    return {
      fileName: file.originalname,
      success: false,
      message: "Failed to save the candidate analysis.",
    };
  }
}

export async function analyzeCandidate(req, res) {
  const files = Array.isArray(req.files)
    ? req.files
    : req.files
      ? [...(req.files.resumes || []), ...(req.files.resume || [])]
      : req.file
        ? [req.file]
        : [];

  try {
    const { requirementId } = req.body || {};
    if (!isValidObjectId(requirementId)) {
      return res.status(400).json({ message: "A valid requirementId is required." });
    }
    if (files.length === 0) {
      return res.status(400).json({ message: "At least one resume file is required." });
    }

    const requirement = await RecruitmentRequirement.findById(requirementId);
    if (!requirement) {
      return res.status(404).json({ message: "Recruitment requirement not found." });
    }
    if (requirement.status !== "Open") {
      return res.status(400).json({ message: "This recruitment requirement is not open." });
    }

    const results = [];
    for (const file of files) {
      results.push(await analyzeResumeFile(file, requirement, req.user._id));
    }

    const successfulCount = results.filter((result) => result.success).length;
    const failedCount = results.length - successfulCount;
    return res.status(failedCount ? 207 : 201).json({
      message: `${successfulCount} of ${results.length} resumes analyzed successfully.`,
      results,
    });
  } catch (error) {
    console.error("analyzeCandidate failed:", error.message);
    return res.status(500).json({ message: "Failed to process the uploaded resumes." });
  } finally {
    await Promise.all(files.map((file) => (
      file.path
        ? fs.unlink(file.path).catch((error) => {
          if (error.code !== "ENOENT") {
            console.warn("Could not remove temporary resume:", error.code);
          }
        })
        : Promise.resolve()
    )));
  }
}

export async function getAnalyses(req, res) {
  try {
    const filter = {};
    if (req.query.requirementId) {
      if (!isValidObjectId(req.query.requirementId)) {
        return res.status(400).json({ message: "Invalid requirement ID." });
      }
      filter.requirementId = req.query.requirementId;
    }
    if (req.query.recommendation) filter.recommendation = req.query.recommendation;
    if (req.query.minScore !== undefined) {
      const minScore = Number(req.query.minScore);
      if (!Number.isFinite(minScore)) {
        return res.status(400).json({ message: "minScore must be a number." });
      }
      filter.overallMatch = { $gte: minScore };
    }

    const analyses = await ResumeAnalysis.find(filter)
      .populate("candidateId", "name email phone resumeFileName status")
      .populate("requirementId", "jobTitle department designation")
      .sort({ overallMatch: -1, createdAt: -1 });
    return res.json(analyses);
  } catch (error) {
    console.error("getAnalyses failed:", error.message);
    return res.status(500).json({ message: "Failed to load candidate analyses." });
  }
}

export async function getAnalysis(req, res) {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid analysis ID." });
  }

  try {
    const analysis = await ResumeAnalysis.findById(req.params.id)
      .populate("candidateId")
      .populate("requirementId");
    if (!analysis) return res.status(404).json({ message: "Analysis not found." });
    return res.json(analysis);
  } catch (error) {
    console.error("getAnalysis failed:", error.message);
    return res.status(500).json({ message: "Failed to load candidate analysis." });
  }
}

export async function updateCandidateStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid candidate ID." });
  }
  if (!candidateStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid candidate status." });
  }

  try {
    const candidate = await RecruitmentCandidate.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );
    if (!candidate) return res.status(404).json({ message: "Candidate not found." });
    return res.json({ message: "Candidate status updated.", candidate });
  } catch (error) {
    console.error("updateCandidateStatus failed:", error.message);
    return res.status(500).json({ message: "Failed to update candidate status." });
  }
}

export async function deleteCandidate(req, res) {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid candidate ID." });
  }

  try {
    const candidate = await RecruitmentCandidate.findById(id);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found." });
    }

    const { deletedCount } = await ResumeAnalysis.deleteMany({ candidateId: id });
    await candidate.deleteOne();
    return res.json({
      message: "Candidate and associated analyses deleted.",
      deletedAnalyses: deletedCount,
    });
  } catch (error) {
    console.error("deleteCandidate failed:", error.message);
    return res.status(500).json({ message: "Failed to delete candidate." });
  }
}