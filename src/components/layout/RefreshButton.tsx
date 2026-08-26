"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { actualiserDonnees } from "@/app/(dashboard)/actions";
import { IconRefresh } from "@/components/ui/Icons";

export function RefreshButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await actualiserDonnees();
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleClick}
      title="Actualiser les données"
      aria-label="Actualiser les données"
      className="flex items-center gap-1.5 rounded-md border border-white/20 px-3 py-1.5 text-sm text-white/80 transition-colors hover:bg-white/10 disabled:opacity-50"
    >
      <IconRefresh size={14} className={isPending ? "animate-spin" : undefined} />
      <span className="hidden sm:inline">
        {isPending ? "Actualisation..." : "Actualiser"}
      </span>
    </button>
  );
}
