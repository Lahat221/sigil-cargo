"use client";

import { STATUT_LABELS } from "./StatutBadge";
import type { CommandeListItem } from "./types";

function csvEscape(value: string) {
  if (/[",\n;]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function ExportCommandesButton({
  commandes,
}: {
  commandes: CommandeListItem[];
}) {
  function handleExport() {
    const headers = [
      "numero",
      "client",
      "telephone",
      "projet",
      "statut",
      "poids_kg",
      "montant_total_eur",
    ];
    const rows = commandes.map((c) =>
      [
        c.numero.toString(),
        c.clients?.nom ?? "",
        c.clients?.telephone ?? "",
        c.projets?.nom ?? "",
        STATUT_LABELS[c.statut],
        c.poids_kg.toString(),
        c.montant_total.toString(),
      ]
        .map(csvEscape)
        .join(";")
    );
    const csv = [headers.join(";"), ...rows].join("\n");
    const blob = new Blob(["﻿" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `commandes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={commandes.length === 0}
      className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
    >
      Exporter
    </button>
  );
}
