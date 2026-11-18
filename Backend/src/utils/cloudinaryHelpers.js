import cloudinary from "../config/cloudinary.js";


export const destroyImage = async (image) => {
  if (!image?.public_id) return;
  try {
    await cloudinary.uploader.destroy(image.public_id);
  } catch (_) {}
};