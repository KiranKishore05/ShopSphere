import { v2 as cloudinary } from 'cloudinary';
import config from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';

const isPlaceholder = !config.CLOUDINARY_API_KEY ||
  config.CLOUDINARY_API_KEY === 'placeholder_api_key' ||
  config.NODE_ENV === 'test';

if (!isPlaceholder) {
  cloudinary.config({
    cloud_name: config.CLOUDINARY_CLOUD_NAME,
    api_key: config.CLOUDINARY_API_KEY,
    api_secret: config.CLOUDINARY_API_SECRET
  });
}

/**
 * Upload an image asset to Cloudinary.
 * Falls back to local/static placeholder handling when live keys are unconfigured.
 */
export const uploadImage = async (fileOrBase64, folder = 'shopsphere/products') => {
  if (isPlaceholder) {
    // Generate deterministic placeholder asset for test / dev without live Cloudinary
    const randomHash = Math.random().toString(36).substring(2, 9);
    return {
      url: `https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1200&q=80`,
      public_id: `shopsphere_mock_${randomHash}`,
      format: 'jpg',
      bytes: 102400,
      width: 1200,
      height: 1600,
      isMock: true
    };
  }

  try {
    const result = await cloudinary.uploader.upload(fileOrBase64, {
      folder,
      resource_type: 'image',
      transformation: [
        { width: 1400, height: 1800, crop: 'limit', quality: 'auto', fetch_format: 'auto' }
      ]
    });

    return {
      url: result.secure_url || result.url,
      public_id: result.public_id,
      format: result.format,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      isMock: false
    };
  } catch (error) {
    console.error('Cloudinary Image Upload Error:', error);
    throw new AppError('Failed to upload image asset to Cloudinary.', 502, 'IMAGE_UPLOAD_ERROR');
  }
};

/**
 * Delete an image asset from Cloudinary by public ID.
 */
export const deleteImage = async (public_id) => {
  if (!public_id || isPlaceholder || public_id.startsWith('shopsphere_mock_')) {
    return { result: 'ok' };
  }

  try {
    const res = await cloudinary.uploader.destroy(public_id);
    return res;
  } catch (error) {
    console.warn(`Failed to delete Cloudinary asset ${public_id}:`, error.message);
    return { result: 'error', error: error.message };
  }
};

export default {
  uploadImage,
  deleteImage
};
