import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./lib/__tests__/setup.ts'],
    globals: true,
    include: ['**/*.test.{ts,tsx}'],
    // coverage config not included — install @vitest/coverage-v8 to enable
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
