"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { IconRefresh } from "@/components/ui/Icons";

export function ActualiserButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => router.refresh())}
      className="flex items-center gap-1.5 rounded-md border border-white/25 px-3 py-1.5 text-sm font-medium text-white/85 transition-colors hover:bg-white/10 disabled:opacity-50"
    >
      <IconRefresh size={15} className={isPending ? "animate-spin" : ""} />
      Actualiser
    </button>
  );
}
