import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://roservicesupport.co.in',
  output: 'static', 
  adapter: vercel(),
  compressHTML: true,
  build: { 
    inlineStylesheets: 'always' 
  },
  devToolbar: { 
    enabled: false 
  },
  // 👇 Ye line Vercel ko force karegi ki wo package ko build me include kare
  vite: {
    build: {
      rollupOptions: {
        external: ['google-ads-api']
      }
    }
  }
});
