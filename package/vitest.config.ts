import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/__tests__/test-setup.ts',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
