/*
 * File: frontend/src/test/setup.ts
 * Last updated: 2026-05-01
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-01: Initial metadata header added
 */

import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import axios from 'axios'
import { TransformStream, WritableStream } from 'node:stream/web'

if (!globalThis.TransformStream) {
  globalThis.TransformStream = TransformStream as typeof globalThis.TransformStream
}

if (!globalThis.WritableStream) {
  globalThis.WritableStream = WritableStream as typeof globalThis.WritableStream
}

// Force axios to use the Node http adapter so MSW can intercept requests
// (jsdom environment uses XHR by default, which bypasses MSW's Node server)
axios.defaults.adapter = axios.getAdapter('http')

afterEach(() => {
  cleanup()
})

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.IntersectionObserver = class IntersectionObserver {
  constructor(
    _callback: IntersectionObserverCallback,
    _options?: IntersectionObserverInit
  ) {}
  observe() {}
  unobserve() {}
  disconnect() {}
  root: Element | null = null;
  rootMargin: string = '';
  thresholds: number | number[] = [];
  takeRecords(): IntersectionObserverEntry[] { return []; }
} as unknown as typeof IntersectionObserver;