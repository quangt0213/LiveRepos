import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// For GitHub Pages: set to "/<repo-name>/". Hash routing keeps deep links safe.
// For Vercel or a custom domain, change to "/".
const BASE = "/portfolio/";

export default defineConfig({
  base: BASE,
  plugins: [react()],
  build: {
    target: "es2020",
    chunkSizeWarningLimit: 900,
    // Each heavy library (three, recharts, katex) is imported by exactly one
    // React.lazy demo, so Rollup already splits them into demo-only chunks.
  },
});
