import mongoose from "mongoose";
import User from "../Models/User.js";
import AuditLog from "../Models/AuditLog.js";

const getUserId = (req) => {
  return req.user?.id || req.user?._id || req.user?.userId;
};

const clean = (value) => {
  if (value === undefined || value === null) return "";
  return String(value).trim();
};

// ============================================================
// GET MY PROFILE
// ============================================================
export const getMyProfile = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({
        message: "Invalid authenticated user.",
      });
    }

    const user = await User.findById(userId)
      .select("-password -passwordHistory -twoFactorSecret");

    if (!user) {
      return res.status(404).json({
        message: "User profile not found.",
      });
    }

    return res.json({
      success: true,
      profile: {
        user: {
          _id: user._id,
          name: user.name || "",
          email: user.email || "",
          username: user.username || "",
          role: user.role || "",
          profileImage: user.profileImage || "",
          phone: user.phone || "",
          address: user.address || "",
          department: user.department || "",
        },

        employee: {
          _id: user._id,
          employeeId: user.employeeId || "",
          department: user.department || "",
          designation: user.designation || "",
          joiningDate: user.joiningDate || null,
          dateOfBirth: user.dateOfBirth || null,
          gender: user.gender || "",
          phone: user.phone || "",
          address: user.address || "",
          status: user.status || "Active",
        },
      },
    });
  } catch (error) {
    console.error("[PROFILE] Get profile:", error);

    return res.status(500).json({
      message: "Failed to load profile.",
    });
  }
};

// ============================================================
// UPDATE MY PROFILE
// ============================================================
export const updateMyProfile = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({
        message: "Invalid authenticated user.",
      });
    }

    const {
      name,
      phone,
      address,
      dateOfBirth,
      gender,
      profileImage,
    } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    const changes = [];

    // --------------------------------------------------------
    // USER PERSONAL DATA
    // --------------------------------------------------------

    if (name !== undefined) {
      const newName = clean(name);

      if (!newName) {
        return res.status(400).json({
          message: "Name is required.",
        });
      }

      if (newName.length < 2 || newName.length > 100) {
        return res.status(400).json({
          message: "Name must contain between 2 and 100 characters.",
        });
      }

      if (user.name !== newName) {
        changes.push("name");
        user.name = newName;
      }
    }

    if (profileImage !== undefined) {
      const nextImage = typeof profileImage === "string" ? profileImage : "";
      if (user.profileImage !== nextImage) {
        changes.push("profileImage");
        user.profileImage = nextImage;
      }
    }

    if (phone !== undefined) {
      const newPhone = clean(phone);
      if (newPhone.length > 30) {
        return res.status(400).json({
          message: "Phone number is too long.",
        });
      }
      if (user.phone !== newPhone) {
        changes.push("phone");
        user.phone = newPhone;
      }
    }

    if (address !== undefined) {
      const newAddress = clean(address);
      if (newAddress.length > 500) {
        return res.status(400).json({
          message: "Address is too long.",
        });
      }
      if (user.address !== newAddress) {
        changes.push("address");
        user.address = newAddress;
      }
    }

    if (gender !== undefined) {
      const allowedGenders = ["Male", "Female", "Other", ""];

      if (!allowedGenders.includes(gender)) {
        return res.status(400).json({
          message: "Invalid gender.",
        });
      }

      const newGender = gender || undefined;
      if (user.gender !== newGender) {
        changes.push("gender");
        user.gender = newGender;
      }
    }

    if (dateOfBirth !== undefined) {
      if (dateOfBirth === "") {
        if (user.dateOfBirth) changes.push("dateOfBirth");
        user.dateOfBirth = undefined;
      } else {
        const dob = new Date(dateOfBirth);

        if (Number.isNaN(dob.getTime())) {
          return res.status(400).json({
            message: "Invalid date of birth.",
          });
        }

        if (dob > new Date()) {
          return res.status(400).json({
            message: "Date of birth cannot be in the future.",
          });
        }

        if (user.dateOfBirth?.getTime() !== dob.getTime()) {
          changes.push("dateOfBirth");
          user.dateOfBirth = dob;
        }
      }
    }

    await user.save();

    // --------------------------------------------------------
    // AUDIT LOG
    // --------------------------------------------------------

    if (changes.length > 0) {
      try {
        await AuditLog.create({
          userId,
          action: "PROFILE_UPDATED",
          module: "Profile",
          details: {
            fields: changes,
          },
          severity: "info",
        });
      } catch (auditError) {
        console.error("[PROFILE] Audit log failed:", auditError);
      }
    }

    // --------------------------------------------------------
    // RETURN FRESH DATA
    // --------------------------------------------------------

    const updatedUser = await User.findById(userId)
      .select("-password -passwordHistory -twoFactorSecret");

    return res.json({
      success: true,
      message:
        changes.length > 0
          ? "Profile updated successfully."
          : "No changes were made.",

      profile: {
        user: {
          _id: user._id,
          name: user.name || "",
          email: user.email || "",
          username: user.username || "",
          role: user.role || "",
          profileImage: user.profileImage || "",
          phone: updatedUser.phone || "",
          address: updatedUser.address || "",
          department: updatedUser.department || "",
        },

        employee: {
          _id: updatedUser._id,
          employeeId: updatedUser.employeeId || "",
          department: updatedUser.department || "",
          designation: updatedUser.designation || "",
          joiningDate: updatedUser.joiningDate || null,
          dateOfBirth: updatedUser.dateOfBirth || null,
          gender: updatedUser.gender || "",
          phone: updatedUser.phone || "",
          address: updatedUser.address || "",
          status: updatedUser.status || "Active",
        },
        },
    });
  } catch (error) {
    console.error("[PROFILE] Update profile:", error);

    return res.status(500).json({
      message: "Failed to update profile.",
    });
  }
};