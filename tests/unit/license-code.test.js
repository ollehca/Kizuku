/**
 * Unit Tests: License Code System
 *
 * Tests license code generation and validation.
 */

const {
  generateLicense,
  validateLicense,
  generateBatch,
  LICENSE_TYPES,
} = require('../../src/services/license-code');

describe('License Code System', () => {
  describe('generateLicense()', () => {
    test('generates valid license code with default options', () => {
      const license = generateLicense();

      expect(license).toHaveProperty('code');
      expect(license).toHaveProperty('type');
      expect(license).toHaveProperty('generatedAt');
      expect(license).toHaveProperty('timestamp');

      // Check format: KIZU-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX
      expect(license.code).toMatch(/^KIZU-[0-9A-F]{5}-[0-9A-F]{5}-[0-9A-F]{5}-[0-9A-F]{5}-[0-9A-F]{5}$/);
    });

    test('generates private license by default', () => {
      const license = generateLicense();
      expect(license.type).toBe('private');
    });

    test('generates business license when specified', () => {
      const license = generateLicense({ type: LICENSE_TYPES.BUSINESS });
      expect(license.type).toBe('business');
    });

    test('generates trial license when specified', () => {
      const license = generateLicense({ type: LICENSE_TYPES.TRIAL });
      expect(license.type).toBe('trial');
    });

    test('includes email when provided', () => {
      const email = 'test@example.com';
      const license = generateLicense({ email });
      expect(license.email).toBe(email);
    });

    test('includes metadata when provided', () => {
      const metadata = { orderId: '12345', customField: 'value' };
      const license = generateLicense({ metadata });
      expect(license.metadata).toEqual(metadata);
    });

    test('generates unique codes', () => {
      const license1 = generateLicense();
      const license2 = generateLicense();
      expect(license1.code).not.toBe(license2.code);
    });

    test('has valid ISO timestamp', () => {
      const license = generateLicense();
      const date = new Date(license.generatedAt);
      expect(date.toString()).not.toBe('Invalid Date');
    });
  });

  describe('validateLicense()', () => {
    test('validates correctly generated license', () => {
      const generated = generateLicense();
      const validation = validateLicense(generated.code);

      expect(validation.valid).toBe(true);
      expect(validation.type).toBe(generated.type);
    });

    test('validates license with different formats', () => {
      const generated = generateLicense();
      const code = generated.code;

      // With hyphens (standard)
      expect(validateLicense(code).valid).toBe(true);

      // Without hyphens - should fail (missing KIZU- prefix after replace)
      const noHyphens = code.replace(/-/g, '');
      expect(validateLicense(noHyphens).valid).toBe(false);

      // Lowercase
      expect(validateLicense(code.toLowerCase()).valid).toBe(true);

      // Mixed case
      expect(validateLicense(code.toLowerCase()).valid).toBe(true);
    });

    test('rejects invalid format', () => {
      const result = validateLicense('INVALID-CODE');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('KIZU-'); // Error says "must start with KIZU-"
    });

    test('rejects code with invalid characters', () => {
      const result = validateLicense('KIZU-XXXXX-XXXXX-XXXXX-XXXXX-XXXXG'); // G not valid hex
      expect(result.valid).toBe(false);
    });

    test('rejects code with wrong length', () => {
      const result = validateLicense('KIZU-12345');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('25 characters'); // Error says "must be exactly 25 characters"
    });

    test('rejects code with tampered signature', () => {
      const generated = generateLicense();
      const code = generated.code;

      // Tamper with last character (signature)
      const tampered = code.slice(0, -1) + '0';
      const result = validateLicense(tampered);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('tampered'); // Error says "invalid or has been tampered with"
    });

    test('rejects code with tampered type', () => {
      const generated = generateLicense({ type: LICENSE_TYPES.PRIVATE });
      const encoded = generated.code.replace(/^KIZU-/, '');

      // Change first character (type byte in hex)
      const tampered = 'KIZU-' + 'B' + encoded.slice(1);
      const result = validateLicense(tampered);

      expect(result.valid).toBe(false);
    });

    test('extracts correct license type', () => {
      const privateCode = generateLicense({ type: LICENSE_TYPES.PRIVATE }).code;
      const businessCode = generateLicense({ type: LICENSE_TYPES.BUSINESS }).code;
      const trialCode = generateLicense({ type: LICENSE_TYPES.TRIAL }).code;

      expect(validateLicense(privateCode).type).toBe('private');
      expect(validateLicense(businessCode).type).toBe('business');
      expect(validateLicense(trialCode).type).toBe('trial');
    });

    test('preserves timestamp information', () => {
      const generated = generateLicense();
      const validation = validateLicense(generated.code);

      expect(validation.timestamp).toBe(generated.timestamp);
      expect(validation.generatedAt).toBe(generated.generatedAt);
    });
  });

  describe('generateBatch()', () => {
    test('generates specified number of licenses', () => {
      const count = 5;
      const batch = generateBatch({ count });
      expect(batch).toHaveLength(count);
    });

    test('all batch licenses are valid', () => {
      const batch = generateBatch({ count: 10 });
      batch.forEach((license) => {
        const validation = validateLicense(license.code);
        expect(validation.valid).toBe(true);
      });
    });

    test('all batch licenses are unique', () => {
      const batch = generateBatch({ count: 20 });
      const codes = batch.map((l) => l.code);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(batch.length);
    });

    test('generates batch with specified type', () => {
      const batch = generateBatch({ count: 5, type: LICENSE_TYPES.BUSINESS });
      batch.forEach((license) => {
        expect(license.type).toBe('business');
      });
    });

    test('generates batch with emails', () => {
      const batch = generateBatch({ count: 3, prefix: 'user' }); // Use 'prefix' not 'emailPrefix'
      batch.forEach((license, index) => {
        expect(license.email).toBe(`user${index + 1}@example.com`);
      });
    });

    test('throws error for invalid count', () => {
      expect(() => generateBatch({ count: 0 })).toThrow();
      expect(() => generateBatch({ count: -1 })).toThrow();
      expect(() => generateBatch({ count: 1001 })).toThrow();
    });
  });

  describe('Edge Cases', () => {
    test('handles empty string', () => {
      const result = validateLicense('');
      expect(result.valid).toBe(false);
    });

    test('handles null/undefined', () => {
      expect(validateLicense(null).valid).toBe(false);
      expect(validateLicense(undefined).valid).toBe(false);
    });

    test('handles very long string', () => {
      const longCode = 'KIZU-'.repeat(100);
      const result = validateLicense(longCode);
      expect(result.valid).toBe(false);
    });

    test('handles special characters', () => {
      const result = validateLicense('KIZU-!@#$%-XXXXX-XXXXX-XXXXX-XXXXX');
      expect(result.valid).toBe(false);
    });

    test('validates codes generated at exact timestamps', () => {
      // Generate multiple codes in quick succession
      const codes = [];
      for (let i = 0; i < 10; i++) {
        codes.push(generateLicense().code);
      }

      codes.forEach((code) => {
        expect(validateLicense(code).valid).toBe(true);
      });
    });
  });

  describe('Security', () => {
    test('signature prevents type modification', () => {
      const privateCode = generateLicense({ type: LICENSE_TYPES.PRIVATE });

      // Try to change 'P' (0x50) to 'B' (0x42) in the encoded data
      const encoded = privateCode.code.replace('KIZU-', '');
      const tampered = 'KIZU-4' + encoded.slice(1); // Change first nibble

      const result = validateLicense(tampered);
      expect(result.valid).toBe(false);
    });

    test('signature prevents timestamp modification', () => {
      const original = generateLicense();
      const code = original.code;

      // Try to change timestamp (characters 6-17)
      const parts = code.split('-');
      parts[1] = '00000'; // Change timestamp
      const tampered = parts.join('-');

      const result = validateLicense(tampered);
      expect(result.valid).toBe(false);
    });

    test('cannot generate valid code without secret', () => {
      // This is implicit - without the secret, you cannot generate
      // a valid HMAC signature. We verify this by checking that
      // manually constructed codes always fail validation.

      const fakeCode = 'KIZU-50019-99AC6-14B35-557C8-00000';
      const result = validateLicense(fakeCode);
      expect(result.valid).toBe(false);
    });
  });
});
