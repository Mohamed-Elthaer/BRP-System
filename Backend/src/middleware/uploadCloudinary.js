import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import { saveLocalUpload } from "../utils/cloudinaryHelpers.js";

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 4 * 1024 * 1024,
  },
});

export const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) return next();

    try {
      const result = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Cloudinary upload timeout")), 8000);
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "matjari",
            resource_type: "image",
            transformation: [{ width: 500, height: 500, crop: "limit" }],
          },
          (error, result) => {
            clearTimeout(timer);
            if (error) reject(error);
            else resolve(result);
          }
        );

        stream.end(req.file.buffer);
      });

      req.uploadedImage = {
        url: result.secure_url,
        public_id: result.public_id,
      };
    } catch (_cloudErr) {
      // Offline / Cloudinary unavailable fallback: store locally
      req.uploadedImage = saveLocalUpload(
        req.file.buffer,
        req.file.originalname,
        "images"
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

export default upload;
