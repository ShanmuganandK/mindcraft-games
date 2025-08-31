/**
 * Test setup for navigation tests
 */

// Global test timeout
jest.setTimeout(10000);

// Basic test environment setup
global.console = {
  ...console,
  // Suppress console.warn and console.error in tests unless needed
  warn: jest.fn(),
  error: jest.fn(),
};