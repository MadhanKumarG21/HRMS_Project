import mongoose from "mongoose";

const recruitmentRequirementSchema = new mongoose.Schema(
  {
    jobTitle: {
      type: String,
      required: true,
      trim: true,
    },

    department: {
      type: String,
      trim: true,
      default: "",
    },

    designation: {
      type: String,
      trim: true,
      default: "",
    },

    requiredSkills: {
      type: [String],
      default: [],
    },

    preferredSkills: {
      type: [String],
      default: [],
    },

    minimumExperienceYears: {
      type: Number,
      min: 0,
      default: 0,
    },

    education: {
      type: String,
      default: "",
      trim: true,
    },

    responsibilities: {
      type: [String],
      default: [],
    },

    additionalRequirements: {
      type: [String],
      default: [],
    },

    location: {
      type: String,
      default: "",
      trim: true,
    },

    employmentType: {
      type: String,
      enum: [
        "Full Time",
        "Part Time",
        "Contract",
        "Internship",
        "Temporary",
      ],
      default: "Full Time",
    },

    status: {
      type: String,
      enum: ["Open", "Closed", "Draft"],
      default: "Open",
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

export default mongoose.model(
  "RecruitmentRequirement",
  recruitmentRequirementSchema
);