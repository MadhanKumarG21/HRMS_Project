// Backend/Services/resumeParser.js

import fs from "node:fs/promises";
import path from "node:path";
import mammoth from "mammoth";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

/**
 * Extract text from PDF/DOCX resume.
 *
 * @param {string} filePath
 * @param {string} mimeType
 * @returns {Promise<string>}
 */
export async function extractResumeText(filePath, mimeType) {
  if (!filePath) {
    throw new Error("Resume file path is required.");
  }

  const extension = path.extname(filePath).toLowerCase();

  // --------------------------------------------------
  // PDF
  // --------------------------------------------------
  if (
    mimeType === "application/pdf" ||
    extension === ".pdf"
  ) {
    const buffer = await fs.readFile(filePath);
    const loadingTask = getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
      disableWorker: true,
    });

    const pages = [];
    try {
      const pdf = await loadingTask.promise;
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        pages.push(content.items.map((item) => item.str || "").join(" "));
      }
    } finally {
      await loadingTask.destroy();
    }

    const text = pages.join("\n\n").trim();

    if (!text) {
      throw new Error(
        "Could not extract readable text from the PDF resume."
      );
    }

    return cleanResumeText(text);
  }

  // --------------------------------------------------
  // DOCX
  // --------------------------------------------------
  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    extension === ".docx"
  ) {
    const result = await mammoth.extractRawText({
      path: filePath,
    });

    const text = result?.value?.trim();

    if (!text) {
      throw new Error(
        "Could not extract readable text from the DOCX resume."
      );
    }

    return cleanResumeText(text);
  }

  throw new Error(
    "Unsupported resume format. Only PDF and DOCX are supported."
  );
}

/**
 * Clean extracted resume text.
 */
function cleanResumeText(text) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}