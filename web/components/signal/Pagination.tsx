import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  /** 기본(9)과 다를 때만 쿼리에 limit 유지 */
  limit?: number;
}

function buildHref(page: number, limit?: number): string {
  const sp = new URLSearchParams();
  sp.set("page", String(page));
  if (limit && limit !== 9) sp.set("limit", String(limit));
  return `/?${sp.toString()}`;
}

export function Pagination({ currentPage, totalPages, limit }: PaginationProps) {
  if (totalPages <= 1) return null;

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  const navItem =
    "inline-flex h-9 items-center gap-1 rounded-md border border-border px-3 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  const disabled = "pointer-events-none opacity-40";

  return (
    <nav
      className="mt-8 flex items-center justify-center gap-3"
      aria-label="페이지네이션"
    >
      <Link
        href={hasPrev ? buildHref(currentPage - 1, limit) : "#"}
        aria-disabled={!hasPrev}
        tabIndex={hasPrev ? undefined : -1}
        className={cn(navItem, !hasPrev && disabled)}
      >
        <ChevronLeft className="size-4" aria-hidden />
        이전
      </Link>

      <span className="text-sm tabular-nums text-muted-foreground" aria-current="page">
        {currentPage} / {totalPages}
      </span>

      <Link
        href={hasNext ? buildHref(currentPage + 1, limit) : "#"}
        aria-disabled={!hasNext}
        tabIndex={hasNext ? undefined : -1}
        className={cn(navItem, !hasNext && disabled)}
      >
        다음
        <ChevronRight className="size-4" aria-hidden />
      </Link>
    </nav>
  );
}
