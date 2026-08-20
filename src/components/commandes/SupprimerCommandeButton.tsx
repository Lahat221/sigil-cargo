"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { supprimerCommande } from "@/app/(dashboard)/commandes/actions";

export function SupprimerCommandeButton({
  commandeId,
  numero,
  redirectToListe = false,
  className,
}: {
  commandeId: string;
  numero: number;
  redirectToListe?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`Supprimer définitivement la commande #${numero} ?`)) return;
    startTransition(async () => {
      const result = await supprimerCommande(commandeId);
      if ("error" in result) {
        alert("Erreur : " + result.error);
        return;
      }
      if (redirectToListe) {
        router.push("/commandes");
      }
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleClick}
      className={
        className ??
        "text-sm text-red-600 hover:underline disabled:opacity-50"
      }
    >
      {isPending ? "..." : "Supprimer"}
    </button>
  );
}
