import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const BASE = "/LiveRepos/";

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
