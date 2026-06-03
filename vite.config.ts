import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { existsSync, readFileSync } from "node:fs";

const tlsKeyFile = process.env.TLS_KEY_FILE;
const tlsCertFile = process.env.TLS_CERT_FILE;
const hasTlsFiles =
  typeof tlsKeyFile === "string" &&
  typeof tlsCertFile === "string" &&
  existsSync(tlsKeyFile) &&
  existsSync(tlsCertFile);

const backendTarget = hasTlsFiles ? "https://localhost:3000" : "http://localhost:3000";

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
    ...(hasTlsFiles
      ? {
          https: {
            key: readFileSync(tlsKeyFile),
            cert: readFileSync(tlsCertFile)
          }
        }
      : {}),
    proxy: {
      // Proxy all frontend '/api' requests directly to Hono
      "/api": {
        target: backendTarget,
        changeOrigin: true,
        secure: false
      },
      // Proxy websocket stream paths to Hono backend
      "/ws": {
        target: backendTarget,
        changeOrigin: true,
        secure: false,
        ws: true
      }
    },
  },
});
