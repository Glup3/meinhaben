import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import react from "@astrojs/react";

const site = new URL(process.env.SITE_URL || "https://meinhaben.glup3.dev");
export default defineConfig({
  site: site.href,
  // Astro 7 validates Host and forwarded headers before exposing Request.url.
  // Trust only this build's public origin and explicit local development hosts.
  security: {
    allowedDomains: [
      { hostname: site.hostname, protocol: site.protocol.slice(0, -1), ...(site.port ? { port: site.port } : {}) },
      { hostname: "localhost", protocol: "http" },
      { hostname: "127.0.0.1", protocol: "http" },
    ],
  },
  output: "server",
  adapter: node({ mode: "standalone" }),
  integrations: [react()],
});
