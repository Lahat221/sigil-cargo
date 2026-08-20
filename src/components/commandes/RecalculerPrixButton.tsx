"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { recalculerPrix } from "@/app/(dashboard)/commandes/actions";
import { IconRefresh } from "@/components/ui/Icons";

export function RecalculerPrixButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (
      !confirm(
        "Recalculer le prix/kg des commandes non livrées et non annulées à partir du tarif actuel du produit ?"
      )
    )
      return;
    startTransition(async () => {
      const result = await recalculerPrix();
      if ("error" in result) {
        alert("Erreur : " + result.error);
        return;
      }
      alert(
        result.nbMisAJour === 0
          ? "Tous les prix étaient déjà à jour."
          : `${result.nbMisAJour} commande(s) mise(s) à jour.`
      );
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleClick}
      className="flex items-center gap-1.5 rounded-md border border-white/25 px-3 py-1.5 text-sm font-medium text-white/85 transition-colors hover:bg-white/10 disabled:opacity-50"
    >
      <IconRefresh size={15} />
      {isPending ? "Calcul..." : "Recalculer prix"}
    </button>
  );
}
