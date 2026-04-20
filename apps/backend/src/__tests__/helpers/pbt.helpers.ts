import * as fc from 'fast-check';

// ─── Domain Arbitraries for Property-Based Testing ────────────────────────────
// These generators produce valid domain values for use in fast-check properties.

/**
 * Generates valid 11-digit NIN strings (National Identification Number).
 * NINs are exactly 11 numeric digits.
 */
export const ninArbitrary: fc.Arbitrary<string> = fc
  .tuple(
    fc.integer({ min: 1, max: 9 }), // First digit non-zero
    fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 10, maxLength: 10 })
  )
  .map(([first, rest]) => `${first}${rest.join('')}`);

/**
 * Generates invalid NIN strings (for negative testing).
 * Produces strings that are NOT valid 11-digit numeric strings.
 */
export const invalidNinArbitrary: fc.Arbitrary<string> = fc.oneof(
  // Too short
  fc.stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), {
    minLength: 1,
    maxLength: 10,
  }),
  // Too long
  fc.stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), {
    minLength: 12,
    maxLength: 20,
  }),
  // Contains non-numeric characters
  fc
    .tuple(
      fc.string({ minLength: 1, maxLength: 5 }),
      fc.constantFrom('a', 'b', 'A', 'Z', '-', ' ', '.', '@'),
      fc.string({ minLength: 1, maxLength: 5 })
    )
    .map(([a, b, c]) => `${a}${b}${c}`),
  // Empty string
  fc.constant('')
);

/**
 * Generates valid 11-digit BVN strings (Bank Verification Number).
 * BVNs follow the same format as NINs: exactly 11 numeric digits.
 */
export const bvnArbitrary: fc.Arbitrary<string> = ninArbitrary;

/**
 * Generates invalid BVN strings (for negative testing).
 */
export const invalidBvnArbitrary: fc.Arbitrary<string> = invalidNinArbitrary;

/**
 * Generates valid Nigerian mobile phone numbers.
 * Format: 11 digits starting with 070, 080, 081, 090, or 091.
 */
export const phoneArbitrary: fc.Arbitrary<string> = fc
  .tuple(
    fc.constantFrom('070', '080', '081', '090', '091'),
    fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 8, maxLength: 8 })
  )
  .map(([prefix, digits]) => `${prefix}${digits.join('')}`);

/**
 * Generates invalid Nigerian phone numbers (for negative testing).
 */
export const invalidPhoneArbitrary: fc.Arbitrary<string> = fc.oneof(
  // Wrong prefix
  fc
    .tuple(
      fc.constantFrom('060', '050', '040', '010', '020'),
      fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 8, maxLength: 8 })
    )
    .map(([prefix, digits]) => `${prefix}${digits.join('')}`),
  // Too short
  fc.stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), {
    minLength: 1,
    maxLength: 10,
  }),
  // Too long
  fc.stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), {
    minLength: 12,
    maxLength: 15,
  }),
  // Empty
  fc.constant('')
);

/**
 * Generates valid email addresses.
 */
export const emailArbitrary: fc.Arbitrary<string> = fc
  .tuple(
    fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), {
      minLength: 3,
      maxLength: 20,
    }),
    fc.constantFrom('gmail.com', 'yahoo.com', 'outlook.com', 'getidfix.com', 'test.com')
  )
  .map(([local, domain]) => `${local}@${domain}`);

/**
 * Generates valid wallet funding amounts (₦100 – ₦1,000,000).
 */
export const validFundingAmountArbitrary: fc.Arbitrary<number> = fc.integer({
  min: 100,
  max: 1_000_000,
});

/**
 * Generates invalid wallet funding amounts (outside ₦100 – ₦1,000,000).
 */
export const invalidFundingAmountArbitrary: fc.Arbitrary<number> = fc.oneof(
  fc.integer({ min: -1_000_000, max: 99 }),
  fc.integer({ min: 1_000_001, max: 10_000_000 })
);

/**
 * Generates valid airtime purchase amounts (₦50 – ₦50,000).
 */
export const validAirtimeAmountArbitrary: fc.Arbitrary<number> = fc.integer({
  min: 50,
  max: 50_000,
});

/**
 * Generates invalid airtime purchase amounts (outside ₦50 – ₦50,000).
 */
export const invalidAirtimeAmountArbitrary: fc.Arbitrary<number> = fc.oneof(
  fc.integer({ min: -100_000, max: 49 }),
  fc.integer({ min: 50_001, max: 1_000_000 })
);

/**
 * Generates valid Nigerian mobile network identifiers.
 */
export const networkArbitrary: fc.Arbitrary<string> = fc.constantFrom(
  'MTN',
  'Airtel',
  'Glo',
  '9mobile'
);

/**
 * Generates a valid UUID v4 string.
 */
export const uuidArbitrary: fc.Arbitrary<string> = fc.uuid();

/**
 * Generates a valid pagination configuration.
 */
export const paginationArbitrary: fc.Arbitrary<{ page: number; pageSize: number }> = fc
  .tuple(
    fc.integer({ min: 1, max: 100 }),
    fc.constantFrom(10, 20, 25, 50, 100)
  )
  .map(([page, pageSize]) => ({ page, pageSize }));

/**
 * Generates a positive decimal amount (for wallet balances, prices, etc.).
 */
export const positiveAmountArbitrary: fc.Arbitrary<number> = fc.float({
  min: 0.01,
  max: 10_000_000,
  noNaN: true,
  noDefaultInfinity: true,
});
