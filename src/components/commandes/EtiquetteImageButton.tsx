"use client";

import { useState } from "react";
import { toPng } from "html-to-image";
import { IconDownload } from "@/components/ui/Icons";

/**
 * Les mini imprimantes Bluetooth "instant printing" à rouleaux adhésifs
 * (type Peripage/Phomemo) n'ont pas de pilote système standard — elles
 * impriment une IMAGE envoyée depuis leur propre appli, pas via la boîte
 * d'impression classique du navigateur (PrintButton). Ce bouton convertit
 * l'étiquette en PNG et ouvre le partage natif du téléphone pour l'envoyer
 * directement à l'appli de l'imprimante ; sans partage natif disponible
 * (ex. ordinateur de bureau), l'image se télécharge à la place.
 */
export function EtiquetteImageButton({ numero }: { numero: number }) {
  const [loading, setLoading] = useState(false);

  async function generer() {
    const node = document.querySelector<HTMLElement>(".etiquette");
    if (!node) return;

    setLoading(true);
    try {
      const filename = `etiquette-colis-${numero}.png`;
      const dataUrl = await toPng(node, { backgroundColor: "#ffffff", pixelRatio: 3 });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], filename, { type: "image/png" });

      const nav = navigator as Navigator & {
        canShare?: (data: { files: File[] }) => boolean;
      };
      if (nav.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
        await nav.share({ files: [file] });
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={generer}
      disabled={loading}
      title="Convertit l'étiquette en image pour l'envoyer à l'appli de l'imprimante Bluetooth"
      className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50 print:hidden"
    >
      <IconDownload size={14} />
      {loading ? "..." : "Image (imprimante BT)"}
    </button>
  );
}
