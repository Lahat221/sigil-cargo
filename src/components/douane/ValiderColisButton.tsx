"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { validerExtraction } from "@/app/(dashboard)/gestion-douaniere/actions";

export function ValiderColisButton({ commandeId }: { commandeId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);

  function valider() {
    setErreur(null);
    startTransition(async () => {
      const resultat = await validerExtraction(commandeId);
      if ("error" in resultat) {
        setErreur(resultat.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={valider}
        disabled={isPending}
        className="rounded-lg bg-gold-gradient px-4 py-2 text-sm font-semibold text-navy shadow-sm transition-all hover:shadow-md hover:brightness-105 disabled:opacity-50"
      >
        {isPending ? "..." : "Valider le colis"}
      </button>
      {erreur && <span className="text-xs text-red-600">{erreur}</span>}
    </div>
  );
}
