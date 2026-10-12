// Input validation and sanitization utilities
import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize user input to prevent XSS attacks
 */
export function sanitize(input: string): string {
  return DOMPurify.sanitize(input.trim(), { 
    ALLOWED_TAGS: [], // Strip all HTML tags
    ALLOWED_ATTR: [] 
  });
}

/**
 * Validate Philippine phone number format
 * Accepts: 09XXXXXXXXX or +639XXXXXXXXX
 */
export function isValidPhilippinePhone(phone: string): boolean {
  const cleanPhone = phone.replace(/[\s\-()]/g, '');
  return /^(09\d{9}|(\+639)\d{9})$/.test(cleanPhone);
}

/**
 * Validate date is not in the past
 */
export function isValidFutureDate(dateStr: string): boolean {
  const selectedDate = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return selectedDate >= today;
}

/**
 * Validate date is a weekday (Mon-Fri)
 */
export function isWeekday(dateStr: string): boolean {
  const date = new Date(dateStr);
  const day = date.getDay();
  return day !== 0 && day !== 6; // Not Sunday or Saturday
}

/**
 * Validate name (at least 3 characters, letters and spaces only)
 */
export function isValidName(name: string): boolean {
  return name.length >= 3 && /^[a-zA-Z\s.'-]+$/.test(name);
}

/**
 * Validate age (1-120)
 */
export function isValidAge(age: string | number): boolean {
  const ageNum = typeof age === 'string' ? parseInt(age, 10) : age;
  return !isNaN(ageNum) && ageNum >= 1 && ageNum <= 120;
}
