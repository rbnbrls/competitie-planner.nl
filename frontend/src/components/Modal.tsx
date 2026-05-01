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

  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
      previousActiveElement.current = document.activeElement as HTMLElement;
      modalRef.current?.focus();
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "unset";
      previousActiveElement.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const titleId = title ? `modal-title-${Math.random().toString(36).substr(2, 9)}` : undefined;
  const descriptionId = description ? `modal-description-${Math.random().toString(36).substr(2, 9)}` : undefined;

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
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
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
