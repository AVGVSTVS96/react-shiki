import { defineConfig } from 'tsup';

export default defineConfig((options) => {
  const dev = !!options.watch;

  return {
    entry: {
      index: 'src/index.ts',
    },
    format: ['esm'],
    target: 'es2022',
    dts: true,
    sourcemap: true,
    clean: !dev,
    minify: !dev,

    // Keep JSX behavior consistent with other package builds, even if the
    // current sources are plain TypeScript.
    esbuildOptions(esbuildOptions) {
      esbuildOptions.jsx = 'automatic';
    },
  };
});
