import { defineConfig } from "vite";

export default defineConfig({
  define: {
    "import.meta.dirname": "__dirname",
  },
  resolve: {
    conditions: ["node"],
  },
  build: {
    rollupOptions: {
      external: ["cpu-features"],
    },
  },
});
