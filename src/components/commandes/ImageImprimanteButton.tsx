"use client";

import { useState } from "react";
import { toPng } from "html-to-image";
import { IconDownload } from "@/components/ui/Icons";

/**
 * Les mini imprimantes Bluetooth "instant printing" à rouleaux adhésifs
 * (type Peripage/Phomemo) n'ont pas de pilote système standard — elles
 * impriment une IMAGE envoyée depuis leur propre appli, pas via la boîte
 * d'impression classique du navigateur (PrintButton). Ce bouton convertit
 * chaque bloc correspondant à `selector` en PNG et ouvre le partage natif
 * du téléphone pour l'envoyer directement à l'appli de l'imprimante ; sans
 * partage natif disponible (ex. ordinateur de bureau), les images se
 * téléchargent à la place. `selector` peut cibler plusieurs blocs (ex. une
 * étiquette par paquet) — chacun devient sa propre image.
 */
export function ImageImprimanteButton({
  selector,
  filenamePrefix,
  label = "Image (imprimante BT)",
}: {
  selector: string;
  filenamePrefix: string;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function generer() {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector));
    if (nodes.length === 0) return;

    setLoading(true);
    try {
      const files: File[] = [];
      for (let i = 0; i < nodes.length; i++) {
        const suffixe = nodes.length > 1 ? `-${i + 1}-${nodes.length}` : "";
        const filename = `${filenamePrefix}${suffixe}.png`;
        const dataUrl = await toPng(nodes[i], {
          backgroundColor: "#ffffff",
          pixelRatio: 3,
        });
        const blob = await (await fetch(dataUrl)).blob();
        files.push(new File([blob], filename, { type: "image/png" }));
      }

      const nav = navigator as Navigator & {
        canShare?: (data: { files: File[] }) => boolean;
      };
      if (nav.share && (!nav.canShare || nav.canShare({ files }))) {
        await nav.share({ files });
        return;
      }

      for (const file of files) {
        const url = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
      }
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
      title="Convertit en image pour l'envoyer à l'appli de l'imprimante Bluetooth"
      className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50 print:hidden"
    >
      <IconDownload size={14} />
      {loading ? "..." : label}
    </button>
  );
}
