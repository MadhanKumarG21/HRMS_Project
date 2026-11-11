// Backend/Middleware/recruitmentUpload.js

import multer from "multer";
import path from "node:path";
import fs from "node:fs";

const maxFileSize =
  Number(process.env.RECRUITMENT_MAX_FILE_SIZE_MB || 10) * 1024 * 1024;

const uploadDirectory =
  path.resolve(
    "uploads",
    "recruitment"
  );

// Make sure directory exists.
fs.mkdirSync(
  uploadDirectory,
  {
    recursive: true,
  }
);

const storage =
  multer.diskStorage({
    destination: (
      req,
      file,
      cb
    ) => {
      cb(
        null,
        uploadDirectory
      );
    },

    filename: (
      req,
      file,
      cb
    ) => {
      const extension =
        path
          .extname(
            file.originalname
          )
          .toLowerCase();

      const uniqueName =
        `resume-${Date.now()}-${Math.round(
          Math.random() * 1e9
        )}${extension}`;

      cb(
        null,
        uniqueName
      );
    },
  });

const fileFilter = (
  req,
  file,
  cb
) => {
  const allowedTypes = [
    "application/pdf",

    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  const allowedExtensions = [
    ".pdf",
    ".docx",
  ];

  const extension =
    path
      .extname(
        file.originalname
      )
      .toLowerCase();

  if (
    allowedTypes.includes(
      file.mimetype
    ) &&
    allowedExtensions.includes(
      extension
    )
  ) {
    return cb(
      null,
      true
    );
  }

  cb(
    new Error(
      "Only PDF and DOCX resumes are allowed."
    )
  );
};

export const recruitmentUpload =
  multer({
    storage,

    fileFilter,

    limits: {
      fileSize: maxFileSize,
      files: 10,
    },
  });