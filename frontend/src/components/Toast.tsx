/*
 * File: frontend/src/components/Toast.tsx
 * Last updated: 2026-05-01
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-01: Initial metadata header added
 */

import { Toaster, toast } from 'react-hot-toast';

export const ToastContainer = () => {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        duration: 5000,
        style: {
          background: 'var(--theme-card-bg)',
          color: 'var(--theme-nav-foreground)',
          borderRadius: '0.75rem',
          boxShadow: 'var(--theme-card-shadow)',
          border: '1px solid var(--tw-border-opacity, rgba(0,0,0,0.1))',
        },
        success: {
          duration: 5000,
          iconTheme: {
            primary: 'var(--theme-primary)',
            secondary: 'var(--theme-accent-foreground)',
          },
        },
        error: {
          duration: 10000, // 10 seconds - long enough to read, prevents accumulation
        },
      }}
    />
  );
};

export const showToast = {
  success: (message: string) => toast.success(message, { id: message }),
  error: (message: string) => toast.error(message, { id: message }),
  info: (message: string) => toast(message, { id: message }),
};
