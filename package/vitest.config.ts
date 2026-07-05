import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.ts',
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['tests/**/*.bench.{ts,tsx}'],
    typecheck: {
      enabled: true,
      include: ['tests/**/*.test-d.{ts,tsx}'],
      tsconfig: './tsconfig.vitest.json',
    },
  },
});
