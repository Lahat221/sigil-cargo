"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { supprimerProjet } from "@/app/(dashboard)/projets/actions";
import { IconTrash } from "@/components/ui/Icons";

export function SupprimerProjetButton({
  projetId,
  nom,
}: {
  projetId: string;
  nom: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`Supprimer définitivement le projet "${nom}" ?`)) return;
    startTransition(async () => {
      const result = await supprimerProjet(projetId);
      if ("error" in result) {
        alert("Erreur : " + result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleClick}
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
    >
      <IconTrash size={14} />
      {isPending ? "..." : "Supprimer"}
    </button>
  );
}
