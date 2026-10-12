// Simple in-memory rate limiter
// For production, use Redis-based solution (Upstash or similar)

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Store rate limit data in memory
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Simple rate limiter
 * @param identifier - Unique identifier (IP address, session ID, etc.)
 * @param maxRequests - Maximum requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns Object with success status and remaining time if limited
 */
export function rateLimit(
  identifier: string,
  maxRequests: number = 3,
  windowMs: number = 10 * 60 * 1000 // 10 minutes
): { success: boolean; remainingMs?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || now > entry.resetTime) {
    // First request or window expired - reset
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return { success: true };
  }

  if (entry.count < maxRequests) {
    // Within limit - increment
    entry.count++;
    return { success: true };
  }

  // Rate limited
  const remainingMs = entry.resetTime - now;
  return { 
    success: false, 
    remainingMs 
  };
}

/**
 * Format remaining time for user-friendly message
 */
export function formatRemainingTime(ms: number): string {
  const minutes = Math.ceil(ms / 60000);
  if (minutes < 1) return 'less than a minute';
  if (minutes === 1) return '1 minute';
  return `${minutes} minutes`;
}
