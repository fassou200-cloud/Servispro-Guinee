// Utility function to get the correct image URL
// Handles both Cloudinary URLs (full URLs starting with https://) and local URLs (/api/uploads/...)

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  
  // If it's a Cloudinary URL, add f_auto transformation for browser compatibility
  // This converts HEIC/HEIF and other unsupported formats to JPEG/WebP automatically
  if (imagePath.includes('res.cloudinary.com')) {
    // Insert f_auto,q_auto after /upload/ if not already present
    if (!imagePath.includes('/f_auto') && !imagePath.includes('/f_jpg')) {
      return imagePath.replace('/upload/', '/upload/f_auto,q_auto/');
    }
    return imagePath;
  }
  
  // If it's already a full URL, return as-is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // Otherwise, it's a local path, prepend backend URL
  return `${BACKEND_URL}${imagePath}`;
};

export default getImageUrl;
