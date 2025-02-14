// https://vitejs.dev/config/
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import mdx from '@mdx-js/rollup';
import tailwind from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), mdx(), tailwind()],
});

