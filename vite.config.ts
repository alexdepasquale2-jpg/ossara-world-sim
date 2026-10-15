import { defineConfig } from "vite";

const repoBase = process.env.GITHUB_PAGES === "true" ? "/ossara-world-sim/" : "/";

export default defineConfig({
  base: repoBase,
  server: {
    host: "0.0.0.0",
    port: 43123,
  },
});
