"use client";

import { IconPrinter } from "@/components/ui/Icons";

/**
 * Ouvre la boîte d'impression du navigateur — "Enregistrer au format PDF"
 * y est proposé comme destination, donc un seul bouton couvre impression
 * papier et export PDF (la mise en page dédiée est dans le bloc @media
 * print de la page qui l'utilise).
 */
export function ImprimerButton({ label = "Imprimer / PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 print:hidden"
    >
      <IconPrinter size={15} />
      {label}
    </button>
  );
}
