import mongoose from "mongoose";

const recruitmentCandidateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: "Unknown",
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    resumeFileName: {
      type: String,
      required: true,
    },

    resumeMimeType: {
      type: String,
      required: true,
    },

    resumeText: {
      type: String,
      required: true,
    },

    source: {
      type: String,
      default: "AI Resume Screening",
    },

    status: {
      type: String,
      enum: [
        "New",
        "Shortlisted",
        "Interview",
        "Rejected",
        "Hired",
      ],
      default: "New",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

recruitmentCandidateSchema.index({
  name: "text",
  email: "text",
});

export default mongoose.model(
  "RecruitmentCandidate",
  recruitmentCandidateSchema
);