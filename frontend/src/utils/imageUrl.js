// Utility function to get the correct image URL
// Handles both Cloudinary URLs (full URLs starting with https://) and local URLs (/api/uploads/...)

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  
  // If it's already a full URL (Cloudinary), return as-is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // Otherwise, it's a local path, prepend backend URL
  return `${BACKEND_URL}${imagePath}`;
};

export default getImageUrl;
