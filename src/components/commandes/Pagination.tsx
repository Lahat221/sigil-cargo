"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function Pagination({
  page,
  totalPages,
  total,
}: {
  page: number;
  totalPages: number;
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function allerA(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (p <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(p));
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  if (totalPages <= 1) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-sm">
      <p className="text-slate-500">
        {total} colis · page {page}/{totalPages}
      </p>
      <div className="flex gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => allerA(page - 1)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
        >
          ← Précédent
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => allerA(page + 1)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
        >
          Suivant →
        </button>
      </div>
    </div>
  );
}
