import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  build: {
    // Build the frontend into a folder Hono can easily serve
    outDir: "dist-frontend", 
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // Proxy all frontend '/api' requests directly to Hono
      "/api": "http://localhost:3000",
    },
  },
});
