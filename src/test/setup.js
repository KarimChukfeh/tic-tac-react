import { expect, afterEach, vi } from 'vitest';
import { cleanup, configure } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

configure({ asyncUtilTimeout: 5_000 });

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.ethereum globally
global.window = global.window || {};
