/*
 * File: frontend/src/components/EmptyState.tsx
 * Last updated: 2026-05-02
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-02: Initial creation - reusable empty state component
 */

import * as React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "../lib/utils";
import { Button, type ButtonProps } from "./Button";

export type EmptyStateVariant = "table" | "card" | "page";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionVariant?: ButtonProps["variant"];
  onAction?: () => void;
  variant?: EmptyStateVariant;
  colSpan?: number;
  className?: string;
  iconClassName?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionVariant = "secondary",
  onAction,
  variant = "card",
  colSpan = 6,
  className,
  iconClassName,
}) => {
  const iconSize = variant === "page" ? 40 : 32;
  const containerClasses = cn(
    "flex flex-col items-center gap-3 text-center",
    variant === "page" && "py-20 space-y-6",
    variant === "card" && "py-16 px-6"
  );

  const iconWrapper = (
    <div
      className={cn(
        "rounded-full flex items-center justify-center bg-gray-50 border border-dashed border-gray-200",
        variant === "page" ? "h-20 w-20" : "h-14 w-14"
      )}
    >
      <Icon
        size={iconSize}
        className={cn("text-gray-300", iconClassName)}
      />
    </div>
  );

  const content = (
    <div className={containerClasses}>
      {iconWrapper}
      <div className="space-y-1">
        <h3 className="font-bold text-gray-900 tracking-tight">{title}</h3>
        {description && (
          <p className="text-sm text-gray-500 max-w-xs mx-auto">
            {description}
          </p>
        )}
      </div>
      {actionLabel && onAction && (
        <Button variant={actionVariant} size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );

  if (variant === "table") {
    return (
      <td
        colSpan={colSpan}
        className={cn("h-48 text-center text-gray-500", className)}
      >
        {content}
      </td>
    );
  }

  if (variant === "page") {
    return <div className={cn("text-center space-y-6", className)}>{content}</div>;
  }

  return (
    <div
      className={cn(
        "border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50",
        className
      )}
    >
      {content}
    </div>
  );
};

export { EmptyState };
