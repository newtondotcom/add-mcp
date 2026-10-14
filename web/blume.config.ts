import { defineConfig } from "blume";

export default defineConfig({
  title: "mcps",
  description:
    "Add MCP servers to your favorite coding agents with a single command.",
  logo: "/logo.svg",

  content: {
    root: "content",
  },

  theme: {
    accent: "teal",
    radius: "md",
    mode: "system",
  },

  ai: {
    llmsTxt: true,
  },

  seo: {
    og: { enabled: true },
    sitemap: true,
    robots: true,
    structuredData: true,
  },

  deployment: {
    output: "static",
    site: "https://newtondotcom.github.io/mcps",
  },
});
