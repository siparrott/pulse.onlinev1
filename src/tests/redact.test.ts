/**
 * Phase 3A: PII Redaction Tests
 */

import { describe, it, expect } from 'vitest';
import { redactPII, redactPayload } from '@/lib/utils/redact';

const R = '[REDACTED]';

describe('redactPII', () => {
  describe('emails', () => {
    it('redacts simple email addresses', () => {
      expect(redactPII('Contact us at hello@example.com')).toBe(
        `Contact us at ${R}`
      );
    });

    it('redacts emails with dots and plus signs', () => {
      expect(redactPII('john.doe+label@sub.domain.co.uk')).toBe(R);
    });

    it('redacts multiple emails', () => {
      expect(redactPII('From a@b.co to c@d.io')).toBe(
        `From ${R} to ${R}`
      );
    });
  });

  describe('phone numbers', () => {
    it('redacts US phone numbers', () => {
      expect(redactPII('Call 555-123-4567')).toBe(`Call ${R}`);
    });

    it('redacts international format', () => {
      expect(redactPII('Call +1 555-123-4567')).toBe(`Call ${R}`);
    });

    it('redacts UK numbers', () => {
      expect(redactPII('Ring 07700 900123')).toBe(`Ring ${R}`);
    });

    it('does not redact short digit sequences', () => {
      // < 7 digits should not be redacted
      expect(redactPII('Order #12345')).toBe('Order #12345');
    });
  });

  describe('SSNs', () => {
    it('redacts SSN with dashes', () => {
      expect(redactPII('SSN: 123-45-6789')).toBe(`SSN: ${R}`);
    });

    it('redacts SSN with spaces', () => {
      expect(redactPII('SSN: 123 45 6789')).toBe(`SSN: ${R}`);
    });
  });

  describe('credit cards', () => {
    it('redacts credit card with dashes', () => {
      expect(redactPII('Card: 4111-1111-1111-1111')).toBe(`Card: ${R}`);
    });

    it('redacts credit card with spaces', () => {
      expect(redactPII('Card: 4111 1111 1111 1111')).toBe(`Card: ${R}`);
    });
  });

  describe('addresses', () => {
    it('redacts street addresses', () => {
      expect(redactPII('Located at 123 Main Street')).toBe(
        `Located at ${R}`
      );
    });

    it('redacts abbreviated street types', () => {
      expect(redactPII('Office at 456 Oak Ave')).toBe(`Office at ${R}`);
    });
  });

  describe('edge cases', () => {
    it('handles empty string', () => {
      expect(redactPII('')).toBe('');
    });

    it('handles null-ish values', () => {
      expect(redactPII(null as unknown as string)).toBe(null);
      expect(redactPII(undefined as unknown as string)).toBe(undefined);
    });

    it('handles text with no PII', () => {
      const clean = 'This is a perfectly clean marketing caption about our product.';
      expect(redactPII(clean)).toBe(clean);
    });

    it('handles multiple PII types in one string', () => {
      const dirty = 'Contact john@example.com at 555-123-4567, SSN 123-45-6789';
      const result = redactPII(dirty);
      expect(result).not.toContain('john@example.com');
      expect(result).not.toContain('555-123-4567');
      expect(result).not.toContain('123-45-6789');
    });
  });
});

describe('redactPayload', () => {
  it('redacts string values in a flat object', () => {
    const input = {
      name: 'John',
      email: 'john@example.com',
      count: 42,
    };
    const result = redactPayload(input);
    expect(result.email).toBe(R);
    expect(result.name).toBe('John'); // No PII
    expect(result.count).toBe(42); // Non-string left alone
  });

  it('recursively redacts nested objects', () => {
    const input = {
      user: {
        contact: {
          email: 'test@test.com',
        },
      },
    };
    const result = redactPayload(input);
    expect((result.user as Record<string, unknown>)).toBeDefined();
    expect(
      ((result.user as Record<string, Record<string, string>>).contact).email
    ).toBe(R);
  });

  it('does not mutate the original object', () => {
    const input = { email: 'test@test.com' };
    const result = redactPayload(input);
    expect(input.email).toBe('test@test.com');
    expect(result.email).toBe(R);
  });
});
