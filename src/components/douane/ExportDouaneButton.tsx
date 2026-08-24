"use client";

import { IconDownload } from "@/components/ui/Icons";

export type LigneExportDouane = {
  clientNom: string;
  typeProduit: string;
  descriptionDouane: string;
  hsCode: string;
  descriptionProduit: string;
  quantite: number;
  poidsKg: string;
  poidsEmbTotal: string;
  telephone: string;
};

function csvEscape(value: string) {
  if (/[",\n;]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function ExportDouaneButton({ lignes }: { lignes: LigneExportDouane[] }) {
  function handleExport() {
    const headers = [
      "Nom client",
      "Type_produit",
      "Description_douane",
      "HS_code_complet",
      "Description produit",
      "Quantité",
      "Poids (kg)",
      "Poids + emb total",
      "Téléphone",
    ];
    const rows = lignes.map((l) =>
      [
        l.clientNom,
        l.typeProduit,
        l.descriptionDouane,
        l.hsCode,
        l.descriptionProduit,
        l.quantite.toString(),
        l.poidsKg,
        l.poidsEmbTotal,
        l.telephone,
      ]
        .map(csvEscape)
        .join(";")
    );
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
      Exporter (colis validés)
    </button>
  );
}
