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
  // 👇 YE NAYA SECTION ADD KAREIN (Isse google-ads-api ka error hat jayega) 👇
  vite: {
    ssr: {
      noExternal: ['google-ads-api']
    }
  }
});
