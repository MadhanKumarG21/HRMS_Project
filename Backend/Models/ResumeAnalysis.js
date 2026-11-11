import mongoose from "mongoose";

const resumeAnalysisSchema = new mongoose.Schema(
  {
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RecruitmentCandidate",
      required: true,
      index: true,
    },

    requirementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RecruitmentRequirement",
      required: true,
      index: true,
    },

    overallMatch: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },

    recommendation: {
      type: String,
      enum: [
        "Strong Match",
        "Shortlist",
        "Review",
        "Not Recommended",
      ],
      required: true,
    },

    confidence: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    skills: {
      matched: {
        type: [String],
        default: [],
      },

      missing: {
        type: [String],
        default: [],
      },

      preferredMatched: {
        type: [String],
        default: [],
      },

      additional: {
        type: [String],
        default: [],
      },
    },

    experience: {
      candidateYears: {
        type: Number,
        default: 0,
      },

      requiredYears: {
        type: Number,
        default: 0,
      },

      match: {
        type: Boolean,
        default: false,
      },

      evidence: {
        type: String,
        default: "",
      },
    },

    education: {
      candidate: {
        type: String,
        default: "",
      },

      required: {
        type: String,
        default: "",
      },

      match: {
        type: Boolean,
        default: false,
      },

      evidence: {
        type: String,
        default: "",
      },
    },

    responsibilities: {
      matched: {
        type: [String],
        default: [],
      },

      missing: {
        type: [String],
        default: [],
      },
    },

    strengths: {
      type: [String],
      default: [],
    },

    gaps: {
      type: [String],
      default: [],
    },

    projects: {
      type: [String],
      default: [],
    },

    summary: {
      type: String,
      default: "",
    },

    recommendationReason: {
      type: String,
      default: "",
    },

    analyzedModel: {
      type: String,
      default: "",
    },

    analyzedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

resumeAnalysisSchema.index({
  candidateId: 1,
  requirementId: 1,
});

export default mongoose.model(
  "ResumeAnalysis",
  resumeAnalysisSchema
);