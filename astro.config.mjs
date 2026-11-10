import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import react from "@astrojs/react";

export default defineConfig({
  site: process.env.SITE_URL || "https://meinhaben.glup3.dev",
  output: "server",
  // Small marketplace pages should paint as a complete document. Streaming can
  // paint a partially parsed header when styles and fonts are already cached.
  adapter: node({ mode: "standalone", experimentalDisableStreaming: true }),
  integrations: [react()],
});
