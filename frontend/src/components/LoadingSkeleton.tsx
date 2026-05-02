/*
 * File: frontend/src/components/LoadingSkeleton.tsx
 * Last updated: 2026-05-01
 * API version: 0.1.0
 * Author: Ruben Barels <ruben@rabar.nl>
 * Changelog:
 *   - 2026-05-01: Initial metadata header added
 */

import { cn } from "../lib/utils";
import { useMemo } from "react";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-gray-200", className)}
      {...props}
    />
  );
}

Skeleton.displayName = "Skeleton";

function LoadingSkeleton({ rows = 5 }: { rows?: number }) {
  const skeletonRows = useMemo(() => Array.from({ length: rows }), [rows]);

  return (
    <div className="space-y-4 w-full">
      <Skeleton className="h-10 w-full" />
      <div className="space-y-2">
        {skeletonRows.map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}

LoadingSkeleton.displayName = "LoadingSkeleton";

export { Skeleton, LoadingSkeleton };
