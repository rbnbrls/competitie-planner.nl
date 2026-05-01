/*
 * File: frontend/vitest.config.ts
 * Last updated: 2026-05-01
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-01: Initial metadata header added
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'tests/e2e/**'],
    env: {
      VITE_API_URL: 'http://localhost:8000/api/v1',
      VITE_PLATFORM_DOMAIN: 'localhost'
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/lib/**/*.ts',
        'src/components/**/*.ts',
        'src/components/**/*.tsx',
        'src/contexts/**/*.ts',
        'src/contexts/**/*.tsx',
        'src/hooks/**/*.ts'
      ],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        'src/stories/**',
        'src/vite-env.d.ts',
        '**/*.stories.ts',
        '**/*.stories.tsx',
        'src/pages/**'
      ]
    }
  }
});