"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { marquerContenuVerifie } from "@/app/(dashboard)/commandes/actions";

export function MarquerVerifieButton({ commandeId }: { commandeId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function marquer() {
    startTransition(async () => {
      await marquerContenuVerifie(commandeId);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={marquer}
      disabled={isPending}
      className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50"
    >
      {isPending ? "..." : "Marquer le contenu comme vérifié"}
    </button>
  );
}
