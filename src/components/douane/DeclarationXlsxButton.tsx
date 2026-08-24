"use client";

import { useState, useTransition } from "react";
import { genererDeclarationXlsx } from "@/app/(dashboard)/gestion-douaniere/actions";
import { IconFileText } from "@/components/ui/Icons";

function telechargerBase64(base64: string, filename: string) {
  const octets = atob(base64);
  const tableau = new Uint8Array(octets.length);
  for (let i = 0; i < octets.length; i++) tableau[i] = octets.charCodeAt(i);
  const blob = new Blob([tableau], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function DeclarationXlsxButton({ projetId }: { projetId: string }) {
  const [isPending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);

  function generer() {
    setErreur(null);
    startTransition(async () => {
      const resultat = await genererDeclarationXlsx(projetId);
      if ("error" in resultat) {
        setErreur(resultat.error);
        return;
      }
      telechargerBase64(resultat.base64, resultat.filename);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={generer}
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50"
      >
        <IconFileText size={15} />
        {isPending ? "Génération..." : "Déclaration (XLSX)"}
      </button>
      {erreur && <span className="text-xs text-red-600">{erreur}</span>}
    </div>
  );
}
