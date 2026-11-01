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
  // 👇 Ye line build error ko fix karegi
  vite: {
    ssr: {
      noExternal: ['google-ads-api']
    }
  }
});
