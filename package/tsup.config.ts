import { defineConfig } from 'tsup';
import { peerDependencies } from './package.json';

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
    injectStyle: true,
    external: [...Object.keys(peerDependencies)],

    // fixes: React is not defined / JSX runtime not automatically injected
    // https://github.com/egoist/tsup/issues/792#issuecomment-2443773071
    esbuildOptions(options) {
      options.jsx = 'automatic';
    },
  };
});
