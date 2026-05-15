/**
 * Auto-format Guinean phone numbers.
 * Returns the input formatted with +224 prefix when the user types a local
 * 9-digit mobile number starting with 6 or 7.
 *
 * Examples:
 *   "620111111"      -> "+224620111111"
 *   "620 11 11 11"   -> "+224620111111"
 *   "+224620111111"  -> "+224620111111" (unchanged)
 *   "224620111111"   -> "+224620111111"
 *   "123"            -> "123" (too short, returned as-is)
 */
export function formatGuineanPhone(value) {
  if (!value) return '';
  // Strip everything except digits and leading +
  const trimmed = value.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/[^\d]/g, '');

  // Already has +224 prefix
  if (hasPlus && digits.startsWith('224') && digits.length >= 12) {
    return '+' + digits;
  }
  // Has 224 prefix without +
  if (!hasPlus && digits.startsWith('224') && digits.length >= 12) {
    return '+' + digits;
  }
  // Local 9-digit Guinean mobile (starts with 6 or 7)
  if (digits.length === 9 && /^[67]/.test(digits)) {
    return '+224' + digits;
  }
  return trimmed;
}

/**
 * Validate that a phone is reasonably long enough to dial.
 * Returns true for ≥ 8 digits.
 */
export function isValidPhone(value) {
  const digits = (value || '').replace(/[^\d]/g, '');
  return digits.length >= 8;
}
