/**
 * Utility functions for the ServisPro application
 */

/**
 * Extract a human-readable error message from an API error response
 * Handles Pydantic validation errors which return an array of error objects
 * 
 * @param {Error} error - The axios error object
 * @param {string} defaultMessage - Default message if no specific error is found
 * @returns {string} Human-readable error message
 */
export const getErrorMessage = (error, defaultMessage = 'Une erreur est survenue') => {
  const detail = error.response?.data?.detail;
  
  if (!detail) return defaultMessage;
  
  // If detail is already a string, return it
  if (typeof detail === 'string') return detail;
  
  // If detail is an array (Pydantic validation errors)
  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map(err => {
      // Pydantic error format: { type, loc, msg, input, ctx, url }
      if (err.msg) return err.msg;
      if (err.message) return err.message;
      return JSON.stringify(err);
    }).join('. ');
  }
  
  // If detail is an object
  if (typeof detail === 'object') {
    if (detail.msg) return detail.msg;
    if (detail.message) return detail.message;
    return JSON.stringify(detail);
  }
  
  return defaultMessage;
};

/**
 * Format a number as currency (GNF)
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '—';
  return `${Number(amount).toLocaleString('fr-FR')} GNF`;
};

/**
 * Format a date string to French locale
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date string
 */
export const formatDate = (dateString) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Format a date string with time
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date and time string
 */
export const formatDateTime = (dateString) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Get relative time string (e.g., "Il y a 5 minutes")
 * @param {string} dateString - ISO date string
 * @returns {string} Relative time string
 */
export const getRelativeTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return "À l'instant";
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `Il y a ${Math.floor(diff / 86400)} j`;
  return formatDate(dateString);
};
