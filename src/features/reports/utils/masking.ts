/**
 * Masks sensitive email addresses and phone/ID numbers
 */
export function maskSensitiveValue(value: any, fieldName: string): string {
  if (value === null || value === undefined) return '';
  const str = String(value).trim();
  const lowerField = fieldName.toLowerCase();

  // 1. Email Masking
  if (lowerField.includes('email') || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) {
    const [localPart, domain] = str.split('@');
    if (!domain) return str;
    if (localPart.length <= 2) {
      return `${localPart[0]}***@${domain}`;
    }
    return `${localPart[0]}***${localPart[localPart.length - 1]}@${domain}`;
  }

  // 2. Phone / Identification Number Masking
  if (
    lowerField.includes('phone') ||
    lowerField.includes('mobile') ||
    lowerField.includes('contact') ||
    lowerField.includes('national_id') ||
    lowerField.includes('ssn') ||
    lowerField.includes('card_number') ||
    lowerField.includes('account_number') ||
    lowerField.includes('aadhaar') ||
    lowerField.includes('pan_number') ||
    lowerField.includes('passport') ||
    /^\+?[0-9\s\-()]{7,}$/.test(str)
  ) {
    const digitsOnly = str.replace(/\D/g, '');
    if (digitsOnly.length >= 4) {
      const lastFour = digitsOnly.slice(-4);
      return `******${lastFour}`;
    }
    return '******';
  }

  return str;
}
