import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import { fail } from "../utils/fail.js";
import { destroyImage, saveLocalUpload } from "../utils/cloudinaryHelpers.js";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

const receiptUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) =>
    ALLOWED.includes(file.mimetype)
      ? cb(null, true)
      : cb(fail("Only JPG, PNG, WEBP or PDF files are allowed", 400)),
});

const uploadOne = async (file) => {
  try {
    const r = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Cloudinary upload timeout")), 8000);
      const stream = cloudinary.uploader.upload_stream(
        { folder: "matjari/receipts", resource_type: "auto" },
        (error, result) => {
          clearTimeout(timer);
          if (error) reject(error);
          else resolve(result);
        },
      );
      stream.end(file.buffer);
    });
    return {
      url: r.secure_url,
      public_id: r.public_id,
      resourceType: r.resource_type,
    };
  } catch (_cloudErr) {
    const local = saveLocalUpload(file.buffer, file.originalname, "receipts");
    return {
      url: local.url,
      public_id: local.public_id,
      resourceType: file.mimetype === "application/pdf" ? "raw" : "image",
    };
  }
};

export const uploadReceipts = async (req, _res, next) => {
  try {
    if (!req.files?.length) return next();
    req.uploadedFiles = await Promise.all(req.files.map(uploadOne));
    next();
  } catch (error) {
    next(error);
  }
};

export const destroyFiles = async (files = []) => {
  await Promise.all(
    files.map((f) => {
      if (String(f?.public_id || "").startsWith("local:")) {
        return destroyImage(f);
      }
      return cloudinary.uploader
        .destroy(f.public_id, { resource_type: f.resourceType || "image" })
        .catch(() => {});
    }),
  );
};

export default receiptUpload;

