/**
 * Phase 3A: PII Redaction
 *
 * Scrubs emails, phone numbers, street addresses, and SSN-like patterns
 * before logging prompts / captions to audit tables or sending them to
 * the vision model.
 *
 * All patterns are intentionally conservative — false positives are
 * better than leaking PII into audit logs.
 */

// ─── Patterns ───────────────────────────────────────

const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

// International-ish phone patterns: +1 555-123-4567, (555) 123 4567, 07700 900123, etc.
const PHONE_REGEX =
  /(?:\+?\d{1,3}[\s\-.]?)?\(?\d{2,4}\)?[\s\-.]?\d{3,4}[\s\-.]?\d{3,4}/g;

// US SSN-like: 123-45-6789 or 123 45 6789
const SSN_REGEX = /\b\d{3}[\s\-]\d{2}[\s\-]\d{4}\b/g;

// Loose street address pattern: starts with a number, contains road-type words
const ADDRESS_REGEX =
  /\b\d{1,5}\s+[\w\s]{2,30}\b(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|court|ct|way|place|pl)\b/gi;

// Credit card-like: 4 groups of 4 digits
const CC_REGEX = /\b\d{4}[\s\-]\d{4}[\s\-]\d{4}[\s\-]\d{4}\b/g;

// ─── Public API ─────────────────────────────────────

const REDACTED = '[REDACTED]';

/**
 * Strip PII from a string. Returns a sanitized copy.
 * Original string is never mutated.
 */
export function redactPII(text: string): string {
  if (!text) return text;

  return text
    .replace(EMAIL_REGEX, REDACTED)
    .replace(SSN_REGEX, REDACTED)
    .replace(CC_REGEX, REDACTED)
    .replace(PHONE_REGEX, (match) => {
      // Only redact phone-like strings with enough digits
      const digitCount = match.replace(/\D/g, '').length;
      return digitCount >= 7 ? REDACTED : match;
    })
    .replace(ADDRESS_REGEX, REDACTED);
}

/**
 * Deep-redact all string values in a plain object.
 * Useful for scrubbing entire audit payloads.
 */
export function redactPayload<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj };
  for (const key of Object.keys(result)) {
    const value = result[key];
    if (typeof value === 'string') {
      (result as Record<string, unknown>)[key] = redactPII(value);
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      (result as Record<string, unknown>)[key] = redactPayload(
        value as Record<string, unknown>
      );
    }
  }
  return result;
}
