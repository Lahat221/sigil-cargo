"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { reactiverAgentIA } from "@/app/(dashboard)/notifications-whatsapp/actions";

const heure = new Intl.DateTimeFormat("fr-FR", { timeStyle: "short", dateStyle: "short" });

export function PauseIABandeau({ telephone, jusqua }: { telephone: string; jusqua: string }) {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reactiver() {
    setErreur(null);
    startTransition(async () => {
      const r = await reactiverAgentIA(telephone);
      if ("error" in r) setErreur(r.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
      <span>
        🤖 Agent IA en pause sur cette conversation jusqu&apos;à{" "}
        {heure.format(new Date(jusqua))}.
        {erreur && <span className="ml-2 text-red-600">{erreur}</span>}
      </span>
      <button
        type="button"
        onClick={reactiver}
        disabled={isPending}
        className="rounded-md border border-amber-300 bg-white px-3 py-1 text-xs font-semibold hover:bg-amber-100 disabled:opacity-50"
      >
        {isPending ? "..." : "Réactiver l'IA"}
      </button>
    </div>
  );
}
