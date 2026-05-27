// Utility function to get the correct image URL
// Handles both Cloudinary URLs (full URLs starting with https://) and local URLs (/api/uploads/...)
// `size` triggers Cloudinary responsive transformation to save bandwidth.

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const SIZE_TRANSFORMS = {
  thumb: 'f_auto,q_auto,w_200,c_limit',
  card: 'f_auto,q_auto,w_600,c_limit',
  medium: 'f_auto,q_auto,w_1000,c_limit',
  large: 'f_auto,q_auto,w_1600,c_limit',
  // default: just format + quality optimization (no size constraint)
  default: 'f_auto,q_auto',
};

export const getImageUrl = (imagePath, size = 'default') => {
  if (!imagePath) return null;

  // Cloudinary URL → inject transformation
  if (imagePath.includes('res.cloudinary.com')) {
    const transform = SIZE_TRANSFORMS[size] || SIZE_TRANSFORMS.default;
    // If a transformation already exists right after /upload/, leave it alone
    if (/\/upload\/(f_|w_|q_|c_)/.test(imagePath)) {
      return imagePath;
    }
    return imagePath.replace('/upload/', `/upload/${transform}/`);
  }

  // Already a full URL (Unsplash, external) → leave as-is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  // Local backend path
  return `${BACKEND_URL}${imagePath}`;
};

export default getImageUrl;
