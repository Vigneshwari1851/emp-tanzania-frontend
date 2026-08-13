import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Select from "@/shared/components/ui/Select";
import { Button } from "@/shared/components/ui/button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalRecords: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string; // e.g., "assets", "employees", "requests"
}

export function TablePaginationFooter({
  currentPage,
  totalPages,
  pageSize,
  totalRecords,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 20, 50],
  itemLabel = "assets",
}: PaginationProps) {
  const startRecord = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalRecords);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      if (start > 2) {
        pages.push("...");
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (end < totalPages - 1) {
        pages.push("...");
      }
      
      pages.push(totalPages);
    }
    
    return pages;
  };

  return (
    <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-card rounded border">
      {/* Count + rows per page */}
      <div className="flex items-center gap-6">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">{startRecord}</span>{" "}
          to <span className="font-medium text-foreground">{endRecord}</span> of{" "}
          <span className="font-medium text-foreground">{totalRecords}</span>{" "}
          {itemLabel}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page:</span>
          <Select
            value={String(pageSize)}
            onChange={(val) => onPageSizeChange(Number(val))}
            options={pageSizeOptions.map((n) => ({ value: String(n), label: String(n) }))}
            className="w-20"
            direction="top"
          />
        </div>
      </div>

      {/* Page buttons */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-muted-foreground" />
          </Button>

          <div className="flex items-center gap-1 mx-2">
            {getPageNumbers().map((page, idx) =>
              typeof page === "number" ? (
                <Button
                  key={idx}
                  variant={currentPage === page ? "primary" : "ghost"}
                  className={`h-10 min-w-[40px] px-2 ${currentPage === page
                    ? "bg-primary text-white shadow-sm"
                    : "text-gray-600 dark:text-muted-foreground hover:bg-muted border-0"
                    }`}
                  onClick={() => onPageChange(page)}
                >
                  {page}
                </Button>
              ) : (
                <span key={idx} className="px-2 text-muted-foreground">
                  …
                </span>
              )
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="w-4 h-4 text-gray-600 dark:text-muted-foreground" />
          </Button>
        </div>
      )}
    </div>
  );
}
