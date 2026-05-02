/*
 * File: frontend/src/components/Modal.tsx
 * Last updated: 2026-05-01
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-01: Initial metadata header added
 */

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "../lib/utils";

let openModalCount = 0;

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";
  showCloseButton?: boolean;
}

const maxWidthClasses = {
  xs: "max-w-xs",
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
};

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = "md",
  showCloseButton = true,
}) => {
  const modalRef = React.useRef<HTMLDivElement>(null);
  const previousActiveElement = React.useRef<HTMLElement | null>(null);
  const onCloseRef = React.useRef(onClose);
  const titleId = React.useId();
  const descriptionId = React.useId();

  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const getFocusableElements = React.useCallback((): HTMLElement[] => {
    const container = modalRef.current;
    if (!container) return [];
    return Array.from(
      container.querySelectorAll<HTMLElement>(
        'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
      )
    ).filter(el => {
      const computedStyle = window.getComputedStyle(el);
      const isVisible =
        el.offsetWidth > 0 ||
        el.offsetHeight > 0 ||
        computedStyle.visibility !== 'hidden' &&
        computedStyle.display !== 'none';
      return isVisible || el === document.activeElement;
    });
  }, []);

  React.useEffect(() => {
    if (!isOpen) return;

    previousActiveElement.current = document.activeElement as HTMLElement;
    openModalCount++;
    document.body.style.overflow = "hidden";

    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    } else {
      modalRef.current?.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }

      if (e.key !== "Tab") return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const isFocusOnModal = document.activeElement === modalRef.current;

      if (isFocusOnModal) {
        e.preventDefault();
        if (!e.shiftKey) {
          first.focus();
        } else {
          last.focus();
        }
        return;
      }

      if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      openModalCount--;
      if (openModalCount === 0) {
        document.body.style.overflow = "unset";
      }
      previousActiveElement.current?.focus();
    };
  }, [isOpen, getFocusableElements]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto px-4 py-6 sm:px-0"
      role="presentation"
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in" 
        onClick={onClose}
        aria-hidden="true"
      />
      
{/* Content */}
       <div
         ref={modalRef}
         role="dialog"
         aria-modal="true"
         {...(title && { "aria-labelledby": titleId })}
         {...(description && { "aria-describedby": descriptionId })}
         className={cn(
          "relative bg-white rounded-xl shadow-2xl overflow-hidden transition-all transform animate-in zoom-in-95 slide-in-from-bottom-4 duration-200",
          maxWidthClasses[maxWidth],
          "w-full mx-auto"
        )}
        tabIndex={-1}
      >
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div>
              {title && <h3 id={titleId} className="text-lg font-bold text-gray-900 leading-none">{title}</h3>}
              {description && <p id={descriptionId} className="mt-1 text-sm text-gray-500">{description}</p>}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Sluiten"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            )}
          </div>
        )}

        <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
          {children}
        </div>

        {footer && (
          <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3 flex-wrap">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export { Modal };
