import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import { fail } from "../utils/fail.js";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];


const receiptUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) =>
    ALLOWED.includes(file.mimetype)
      ? cb(null, true)
      : cb(fail("Only JPG, PNG, WEBP or PDF files are allowed", 400)),
});

const uploadOne = (file) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "matjari/receipts", resource_type: "auto" },
      (error, result) => (error ? reject(error) : resolve(result)),
    );
    stream.end(file.buffer);
  });

export const uploadReceipts = async (req, _res, next) => {
  try {
    if (!req.files?.length) return next();
    const results = await Promise.all(req.files.map(uploadOne));
    req.uploadedFiles = results.map((r) => ({
      url: r.secure_url,
      public_id: r.public_id,
      resourceType: r.resource_type,
    }));
    next();
  } catch (error) {
    next(error);
  }
};

export const destroyFiles = async (files = []) => {
  await Promise.all(
    files.map((f) =>
      cloudinary.uploader
        .destroy(f.public_id, { resource_type: f.resourceType || "image" })
        .catch(() => {}),
    ),
  );
};

export default receiptUpload;
