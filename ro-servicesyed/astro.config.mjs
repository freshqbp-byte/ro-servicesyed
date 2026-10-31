import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://roservicesupport.co.in',
  output: 'static', 
  adapter: vercel(),
  compressHTML: true,
  build: { 
    inlineStylesheets: 'always' // 👈 CSS ko inline kar diya (Render-blocking fix)
  },
  devToolbar: { 
    enabled: false 
  }
});