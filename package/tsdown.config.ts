import { defineConfig } from 'tsdown';

export default defineConfig((options) => {
  const dev = !!options.watch;
  return {
    entry: {
      index: 'src/index.ts',
      web: 'src/web.ts',
      core: 'src/core.ts',
    },
    format: ['esm'],
    target: 'es2022',
    dts: true,
    sourcemap: true,
    clean: !dev,
    css: { inject: true },
    deps: {
      onlyBundle: ['@types/hast', '@types/unist'],
    },
    publint: true,
    attw: {
      profile: 'esm-only',
    },
  };
});
