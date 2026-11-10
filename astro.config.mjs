import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import react from "@astrojs/react";

export default defineConfig({
  site: process.env.SITE_URL || "https://meinhaben.glup3.dev",
  output: "server",
  adapter: node({ mode: "standalone" }),
  integrations: [react()],
});
