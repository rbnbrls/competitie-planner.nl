import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isDisabled?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  isDisabled = false,
}) => {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  
  // Show max 5 page numbers, centered around current page
  let visiblePages = pages;
  if (totalPages > 5) {
    const start = Math.max(0, Math.min(totalPages - 5, currentPage - 3));
    visiblePages = pages.slice(start, start + 5);
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1 || isDisabled}
        className="p-2 rounded-md border border-gray-300 disabled:opacity-50 hover:bg-gray-50 active:bg-gray-100 transition-colors"
        aria-label="Vorige pagina"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {visiblePages[0] > 1 && (
        <>
          <button
            onClick={() => onPageChange(1)}
            disabled={isDisabled}
            className="w-10 h-10 rounded-md border border-gray-300 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            1
          </button>
          {visiblePages[0] > 2 && <span className="text-gray-400">...</span>}
        </>
      )}

      {visiblePages.map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          disabled={isDisabled}
          className={`w-10 h-10 rounded-md transition-all ${
            currentPage === page
              ? "bg-blue-600 text-white border-blue-600 font-bold shadow-sm"
              : "border border-gray-300 hover:bg-gray-50 active:bg-gray-100"
          }`}
        >
          {page}
        </button>
      ))}

      {visiblePages[visiblePages.length - 1] < totalPages && (
        <>
          {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
            <span className="text-gray-400">...</span>
          )}
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={isDisabled}
            className="w-10 h-10 rounded-md border border-gray-300 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            {totalPages}
          </button>
        </>
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages || isDisabled}
        className="p-2 rounded-md border border-gray-300 disabled:opacity-50 hover:bg-gray-50 active:bg-gray-100 transition-colors"
        aria-label="Volgende pagina"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
};
