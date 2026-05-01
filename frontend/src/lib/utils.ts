/*
 * File: frontend/src/lib/utils.ts
 * Last updated: 2026-05-01
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-01: Initial metadata header added
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AxiosErrorResponse {
  response?: {
    data?: {
      detail?: unknown;
    };
  };
}

export function getErrorMessage(err: unknown, fallback = "Er is iets misgegaan"): string {
  const error = err as AxiosErrorResponse | undefined;
  const detail = error?.response?.data?.detail;
  
  if (!detail) {
    return fallback;
  }
  
  if (typeof detail === "string") {
    return detail;
  }
  
  if (Array.isArray(detail)) {
    if (detail.length > 0) {
      const firstError = detail[0];
      if (typeof firstError === "string") {
        return firstError;
      }
      if (typeof firstError === "object" && firstError !== null) {
        const msg = (firstError as { msg?: string }).msg;
        if (msg) {
          return msg;
        }
      }
    }
    return fallback;
  }
  
  return fallback;
}