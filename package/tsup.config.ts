import { defineConfig } from 'tsup';
import { peerDependencies } from './package.json';

export default defineConfig((options) => {
  const dev = !!options.watch;
  return {
    entry: ['src/index.ts'],
    format: ['esm'],
    target: 'es2022',
    dts: true,
    sourcemap: true,
    clean: !dev,
    minify: !dev,
    injectStyle: true,
    external: [...Object.keys(peerDependencies)],
  };
});
