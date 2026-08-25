"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { validerDeclarationDakar } from "@/app/(dashboard)/gestion-douaniere/actions";
import { IconShieldCheck } from "@/components/ui/Icons";

export function ValiderDeclarationButton({
  projetId,
  dejaValidee,
}: {
  projetId: string;
  dejaValidee: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);

  function valider() {
    setErreur(null);
    startTransition(async () => {
      const resultat = await validerDeclarationDakar(projetId);
      if ("error" in resultat) {
        setErreur(resultat.error);
        return;
      }
      router.refresh();
    });
  }

  if (dejaValidee) {
    return (
      <span className="flex items-center gap-1.5 rounded-md bg-emerald-100 px-3 py-1.5 text-sm font-medium text-emerald-700">
        <IconShieldCheck size={15} />
        Déclaration validée
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={valider}
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-md bg-gold-gradient px-3 py-1.5 text-sm font-semibold text-navy shadow-sm transition-all hover:shadow-md hover:brightness-105 disabled:opacity-50"
        title="Confirme que les valeurs saisies ci-dessus sont complètes et correctes — requis avant l'audit/génération France."
      >
        <IconShieldCheck size={15} />
        {isPending ? "..." : "Valider la déclaration"}
      </button>
      {erreur && <span className="text-xs text-red-600">{erreur}</span>}
    </div>
  );
}
