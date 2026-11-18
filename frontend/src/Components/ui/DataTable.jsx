import { ChevronLeft, ChevronRight } from "lucide-react";
import { EmptyState, Skeleton } from "./Display.jsx";

// columns: [{ key, label, render?(row), className?, align? }]
export default function DataTable({ columns, rows = [], loading = false, empty = "Nothing here yet", emptyIcon, onRowClick, rowKey = "_id" }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-line bg-primary-soft/50 text-left text-xs uppercase tracking-wide text-muted">
            {columns.map((c) => (
              <th key={c.key} className={`px-4 py-3 font-semibold ${c.align === "right" ? "text-right" : ""}`}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && !rows.length
            ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-line last:border-0">
                  {columns.map((c) => <td key={c.key} className="px-4 py-3"><Skeleton className="h-5 w-full max-w-[140px]" /></td>)}
                </tr>
              ))
            : rows.map((row) => (
                <tr
                  key={row[rowKey]}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`border-b border-line transition-colors last:border-0 hover:bg-primary-soft/40 ${onRowClick ? "cursor-pointer" : ""}`}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={`px-4 py-3 align-middle ${c.align === "right" ? "text-right" : ""} ${c.className || ""}`}>
                      {c.render ? c.render(row) : row[c.key] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
      {!loading && !rows.length && <EmptyState icon={emptyIcon} title={empty} />}
    </div>
  );
}

export function Pagination({ meta, onChange }) {
  if (!meta || meta.pages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between text-sm">
      <span className="text-muted">Page {meta.page} of {meta.pages} · {meta.total} results</span>
      <div className="flex gap-2">
        <button disabled={meta.page <= 1} onClick={() => onChange(meta.page - 1)} className="grid size-9 place-items-center rounded-xl border border-line bg-surface hover:bg-primary-soft disabled:opacity-40" aria-label="Previous page"><ChevronLeft className="size-4" /></button>
        <button disabled={meta.page >= meta.pages} onClick={() => onChange(meta.page + 1)} className="grid size-9 place-items-center rounded-xl border border-line bg-surface hover:bg-primary-soft disabled:opacity-40" aria-label="Next page"><ChevronRight className="size-4" /></button>
      </div>
    </div>
  );
}
