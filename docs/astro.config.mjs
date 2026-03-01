import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://react-shiki.vercel.app',
  integrations: [
    starlight({
      title: 'react-shiki',
      description: 'A performant client-side syntax highlighting component and hook for React, built with Shiki.',
      social: {
        github: 'https://github.com/AVGVSTVS96/react-shiki',
      },
      logo: {
        src: './src/assets/shiki-logo.svg',
        replacesTitle: false,
      },
      editLink: {
        baseUrl: 'https://github.com/AVGVSTVS96/react-shiki/edit/main/docs/',
      },
      customCss: [
        './src/styles/custom.css',
      ],
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Introduction', slug: 'getting-started/introduction' },
            { label: 'Installation', slug: 'getting-started/installation' },
            { label: 'Quick Start', slug: 'getting-started/quick-start' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { label: 'Bundle Options', slug: 'guides/bundle-options' },
            { label: 'Themes', slug: 'guides/themes' },
            { label: 'Languages', slug: 'guides/languages' },
            { label: 'Line Numbers', slug: 'guides/line-numbers' },
            { label: 'Transformers', slug: 'guides/transformers' },
            { label: 'react-markdown Integration', slug: 'guides/react-markdown' },
            { label: 'Performance', slug: 'guides/performance' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'Component Props', slug: 'reference/component-props' },
            { label: 'Hook Options', slug: 'reference/hook-options' },
            { label: 'RegExp Engines', slug: 'reference/regexp-engines' },
          ],
        },
      ],
    }),
  ],
});
