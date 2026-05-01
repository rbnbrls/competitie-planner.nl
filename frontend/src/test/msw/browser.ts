/*
 * File: frontend/src/test/msw/browser.ts
 * Last updated: 2026-05-01
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-01: Initial metadata header added
 */

import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)