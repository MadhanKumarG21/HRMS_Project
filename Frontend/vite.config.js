import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },

  build: {
    // Output directory for production builds.
    outDir: "dist",
    // Generate source maps for production debugging.
    sourcemap: true,
    // Minify the bundle for production.
    minify: "esbuild",
    // Set the target ES version for compatibility.
    target: "es2020",
    // Split chunks for better caching and smaller initial bundle.
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules")) {
            return "vendor";
          }
        },
      },
    },
  },
});