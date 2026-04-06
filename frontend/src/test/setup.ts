import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import axios from 'axios'

// Force axios to use the Node http adapter so MSW can intercept requests
// (jsdom environment uses XHR by default, which bypasses MSW's Node server)
axios.defaults.adapter = 'http'

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