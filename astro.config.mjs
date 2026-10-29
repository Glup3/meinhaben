import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: process.env.SITE_URL || 'https://meinhaben.ditto.glup3.dev',
  output: 'static',
  vite: {
    plugins: [tailwindcss()],
  },
});
