// @ts-check
import { defineConfig } from 'astro/config';
import { foldkit } from '@foldkit/vite-plugin';

// https://astro.build/config
export default defineConfig({
  site: 'https://noslopfactory.com',
  vite: {
    // The plugin gives Foldkit views stable identities. Foldkit requires it.
    plugins: [foldkit({ devToolsMcpPort: false })],
  },
});
