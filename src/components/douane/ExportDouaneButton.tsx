"use client";

import { IconDownload } from "@/components/ui/Icons";
import { STATUT_DOUANE_LABELS } from "./statutLabels";
import type { LigneVueEnsemble } from "@/lib/douane/vueEnsemble";

function csvEscape(value: string) {
  if (/[",\n;]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function ExportDouaneButton({
  lignes,
  label = "Exporter",
}: {
  lignes: LigneVueEnsemble[];
  label?: string;
}) {
  function handleExport() {
    const headers = [
      "N° colis",
      "Nom client",
      "Téléphone",
      "Statut",
      "Type_produit",
      "Description_douane",
      "HS_code_complet",
      "Description produit",
      "Quantité",
      "Poids + emb total",
    ];

    const vusPourColis = new Set<string>();
    const rows = lignes.map((l) => {
      const premiereLigneDuColis = !vusPourColis.has(l.colisId);
      vusPourColis.add(l.colisId);
      return [
        `#${l.numero}`,
        l.clientNom,
        l.telephone,
        STATUT_DOUANE_LABELS[l.statutColis],
        l.typeProduit ?? "",
        l.descriptionDouane ?? "",
        l.hsCode ?? "",
        l.descriptionProduit && l.quantite != null
          ? `${l.descriptionProduit} (${l.quantite} ${l.unite ?? ""})`
          : "",
        l.quantite != null ? l.quantite.toString() : "",
        premiereLigneDuColis ? `${l.poidsKg} kg` : "",
      ]
        .map(csvEscape)
        .join(";");
    });

    const csv = [headers.join(";"), ...rows].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `declaration-douane-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={lignes.length === 0}
      className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50"
    >
      <IconDownload size={15} />
      {label}
    </button>
  );
}
