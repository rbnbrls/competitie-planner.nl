/*
 * File: frontend/vite.config.ts
 * Last updated: 2026-05-01
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-01: Initial metadata header added
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default defineConfig({
  plugins: [
    react(),
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      telemetry: false,
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-dnd": ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-utils": ["clsx", "class-variance-authority", "tailwind-merge", "zod"],
        },
      },
    },
  },
  server: {
    port: 5173,
    allowedHosts: [".lvh.me", "meppers.lvh.me", "localhost", "127.0.0.1"],
    proxy: {
      "/api": {
        target: "http://backend:8000",
        changeOrigin: true,
      },
      "/health": {
        target: "http://backend:8000",
        changeOrigin: true,
      },
    },
  },
});