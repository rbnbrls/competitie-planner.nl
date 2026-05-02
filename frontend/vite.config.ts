/*
 * File: frontend/vite.config.ts
 * Last updated: 2026-05-01
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-01: Initial metadata header added
 *   - 2026-05-02: Added rollup-plugin-visualizer for bundle analysis
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  plugins: [
    react(),
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      telemetry: false,
      sourcemaps: {
        deleteAfterUpload: true,
      },
    }),
    visualizer({
      template: "treemap",
      filename: "stats.html",
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: !!process.env.SENTRY_AUTH_TOKEN,
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
    // Allowed hosts for local development only.
    // - localhost/127.0.0.1: Standard dev server access
    // - lvh.me: Resolves to 127.0.0.1, used for local multi-tenant subdomain testing
    // - *.lvh.me: Any subdomain of lvh.me (e.g., pvdv.lvh.me, testvereniging.lvh.me)
    allowedHosts: true,
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