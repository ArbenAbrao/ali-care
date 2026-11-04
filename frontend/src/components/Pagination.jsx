import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Client-side pagination for lists that are already loaded in memory.
// const pg = usePagination(items, 10);  ->  render pg.slice, then <Pagination {...pg} onPage={pg.setPage} />
export function usePagination(items, pageSize = 10) {
  const [page, setPage] = useState(1);
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  // If rows disappear (search, refresh, delete) and the current page no longer exists, step back.
  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [page, pages]);

  const slice = useMemo(() => items.slice((page - 1) * pageSize, page * pageSize), [items, page, pageSize]);

  return { page, setPage, pages, total, pageSize, slice };
}

// 1 … 4 5 6 … 12
function pageList(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const out = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pages - 1, page + 1);
  if (start > 2) out.push('…');
  for (let p = start; p <= end; p++) out.push(p);
  if (end < pages - 1) out.push('…');
  out.push(pages);
  return out;
}

export default function Pagination({ page, pages, total, pageSize, onPage, label = 'results', className = '' }) {
  if (!total) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div className={`flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row ${className}`}>
      <span className="text-sm text-slate-500">
        Showing <b className="tabular-nums text-slate-700">{from}–{to}</b> of <b className="tabular-nums text-slate-700">{total}</b> {label}
      </span>

      {pages > 1 && (
        <nav className="flex items-center gap-1.5" aria-label="Pagination">
          <button className="btn btn-muted !px-3 !py-2" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
            <ChevronLeft size={16} />
            <span className="hidden sm:inline">Previous</span>
          </button>

          <div className="hidden items-center gap-1 sm:flex">
            {pageList(page, pages).map((p, i) =>
              p === '…' ? (
                <span key={`gap-${i}`} className="px-1.5 text-slate-400">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => onPage(p)}
                  aria-current={p === page ? 'page' : undefined}
                  className={`h-9 min-w-9 rounded-xl px-2 text-sm font-semibold tabular-nums transition-colors ${
                    p === page
                      ? 'bg-gradient-to-b from-[#2f5fd9] to-[#1f46b8] text-white shadow-[0_8px_18px_-8px_rgba(34,80,200,0.7)]'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {p}
                </button>
              )
            )}
          </div>

          <span className="px-2 text-sm font-semibold tabular-nums text-slate-600 sm:hidden">
            {page} / {pages}
          </span>

          <button className="btn btn-muted !px-3 !py-2" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page">
            <span className="hidden sm:inline">Next</span>
            <ChevronRight size={16} />
          </button>
        </nav>
      )}
    </div>
  );
}