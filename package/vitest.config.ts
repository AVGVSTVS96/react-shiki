import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    // Automatically loads setup file before tests run
    setupFiles: './src/__tests__/setupTests.ts',
    include: ['src/**/*.{test,spec}.{ts,tsx}']
  }
});

