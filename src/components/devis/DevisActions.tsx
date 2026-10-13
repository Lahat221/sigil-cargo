"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { changerStatutDevis, supprimerDevis } from "@/app/(dashboard)/devis/actions";
import { IconTrash } from "@/components/ui/Icons";

type StatutDevis = "nouvelle" | "en_cours" | "traitee";

export function DevisActions({ id, statut }: { id: string; statut: StatutDevis }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function changer(nouveau: StatutDevis) {
    startTransition(async () => {
      const r = await changerStatutDevis(id, nouveau);
      if ("error" in r) alert("Erreur : " + r.error);
      router.refresh();
    });
  }

  function supprimer() {
    if (!confirm("Supprimer définitivement cette demande de devis ?")) return;
    startTransition(async () => {
      const r = await supprimerDevis(id);
      if ("error" in r) alert("Erreur : " + r.error);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={statut}
        disabled={isPending}
        onChange={(e) => changer(e.target.value as StatutDevis)}
        className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-navy focus:outline-none disabled:opacity-50"
      >
        <option value="nouvelle">Nouvelle</option>
        <option value="en_cours">En cours</option>
        <option value="traitee">Traitée</option>
      </select>
      <button
        type="button"
        onClick={supprimer}
        disabled={isPending}
        aria-label="Supprimer la demande"
        className="rounded-md p-2 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
      >
        <IconTrash size={15} />
      </button>
    </div>
  );
}
