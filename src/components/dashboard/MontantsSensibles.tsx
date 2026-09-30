"use client";

import { useState } from "react";
import { KpiCard } from "./KpiCard";
import { IconEye, IconEyeOff } from "@/components/ui/Icons";

type Carte = {
  label: string;
  valeur: string;
  sousTitre: string;
  couleur: string;
  icone: string;
};

export function MontantsSensibles({ cartes }: { cartes: Carte[] }) {
  // Masqués par défaut à chaque chargement du tableau de bord — pour ne
  // pas afficher CA/dépenses/bénéfice si quelqu'un regarde l'écran.
  const [visible, setVisible] = useState(false);

  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center justify-end">
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-100"
        >
          {visible ? <IconEyeOff size={15} /> : <IconEye size={15} />}
          {visible ? "Masquer les montants" : "Afficher les montants"}
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cartes.map((c) => (
          <KpiCard key={c.label} {...c} masked={!visible} />
        ))}
      </div>
    </div>
  );
}
