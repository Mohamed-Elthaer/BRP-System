import fs from "fs";
import path from "path";
import crypto from "crypto";
import cloudinary from "../config/cloudinary.js";

export const getUploadsDir = () => {
  const baseDir =
    process.env.USER_DATA_PATH ||
    (process.env.APPDATA
      ? path.join(process.env.APPDATA, "BRP-System")
      : path.resolve(process.cwd(), "local_data"));
  const dir = path.join(baseDir, "uploads");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

export const saveLocalUpload = (buffer, originalname = "file.bin", subfolder = "") => {
  const ext = path.extname(originalname || "") || ".jpg";
  const filename = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
  const targetDir = subfolder ? path.join(getUploadsDir(), subfolder) : getUploadsDir();
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  const fullPath = path.join(targetDir, filename);
  fs.writeFileSync(fullPath, buffer);
  const relPath = subfolder ? `${subfolder}/${filename}` : filename;
  const port = process.env.PORT || 5000;
  return {
    url: `http://localhost:${port}/uploads/${relPath}`,
    public_id: `local:${relPath}`,
  };
};

export const destroyImage = async (image) => {
  if (!image?.public_id) return;
  if (String(image.public_id).startsWith("local:")) {
    try {
      const rel = String(image.public_id).slice(6);
      const fullPath = path.join(getUploadsDir(), rel);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    } catch (_) {}
    return;
  }
  try {
    await cloudinary.uploader.destroy(image.public_id);
  } catch (_) {}
};
