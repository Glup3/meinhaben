import { defineConfig } from 'astro/config';

export default defineConfig({
  site: process.env.SITE_URL || 'https://meinhaben.ditto.glup3.dev',
  output: 'static',
});
