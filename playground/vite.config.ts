// https://vitejs.dev/config/
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import mdx from '@mdx-js/rollup';
import tailwind from '@tailwindcss/vite';

const ROOT_DIR = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@streaming-lab': resolve(
        ROOT_DIR,
        '../package/src/dev/streaming-lab'
      ),
    },
  },
  plugins: [react(), mdx(), tailwind()],
});
