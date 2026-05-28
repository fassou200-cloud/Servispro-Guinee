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
  // Network / no response (CORS, timeout, connection lost)
  if (error && !error.response) {
    if (error.code === 'ECONNABORTED') {
      return "Le téléversement a expiré. Réessayez avec des fichiers plus légers (compressez vos images ou PDF).";
    }
    if (error.message && /Network/i.test(error.message)) {
      return "Connexion réseau interrompue. Vérifiez votre connexion internet et réessayez.";
    }
  }

  const status = error?.response?.status;
  if (status === 413) {
    return "Vos fichiers sont trop volumineux pour le serveur. Réduisez la taille (max 2 Mo par document recommandé) et réessayez.";
  }
  if (status === 502 || status === 503 || status === 504) {
    return "Le serveur est momentanément indisponible. Réessayez dans quelques instants.";
  }

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

/**
 * Returns the currently-logged-in user's contact info (name + phone) from
 * any of the 3 user types (customer, provider, company). Returns null when
 * no user is logged in.
 */
export const getCurrentUserContact = () => {
  try {
    const customer = JSON.parse(localStorage.getItem('customer') || 'null');
    if (customer) {
      return {
        name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
        phone: customer.phone_number || '',
        type: 'customer',
      };
    }
  } catch {}
  try {
    const provider = JSON.parse(localStorage.getItem('user') || 'null');
    if (provider) {
      return {
        name: `${provider.first_name || ''} ${provider.last_name || ''}`.trim(),
        phone: provider.phone_number || '',
        type: 'provider',
      };
    }
  } catch {}
  try {
    const company = JSON.parse(localStorage.getItem('company') || 'null');
    if (company) {
      return {
        name: company.contact_person_name || company.company_name || '',
        phone: company.contact_person_phone || company.phone_number || '',
        type: 'company',
      };
    }
  } catch {}
  return null;
};

/**
 * Stash a verified phone in sessionStorage so a user doesn't re-verify
 * the same number twice during the same session.
 */
const VERIFIED_PHONES_KEY = 'verified_phones_session';
export const isPhoneVerifiedInSession = (phone) => {
  try {
    const arr = JSON.parse(sessionStorage.getItem(VERIFIED_PHONES_KEY) || '[]');
    return arr.includes((phone || '').replace(/\D/g, ''));
  } catch {
    return false;
  }
};
export const markPhoneVerifiedInSession = (phone) => {
  try {
    const arr = JSON.parse(sessionStorage.getItem(VERIFIED_PHONES_KEY) || '[]');
    const norm = (phone || '').replace(/\D/g, '');
    if (norm && !arr.includes(norm)) {
      arr.push(norm);
      sessionStorage.setItem(VERIFIED_PHONES_KEY, JSON.stringify(arr));
    }
  } catch {}
};
