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
import { ApiError } from "./api";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getErrorMessage(err: unknown, fallback = "Er is iets misgegaan"): string {
  if (err instanceof ApiError && err.data?.detail) {
    const detail = err.data.detail;
    if (typeof detail === "string") {
      return detail;
    }
  }
  
  if (typeof err === "object" && err !== null && "response" in err) {
    const axiosErr = err as { response?: { data?: { detail?: unknown } } };
    const detail = axiosErr.response?.data?.detail;
    
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
  }
  
  return fallback;
}