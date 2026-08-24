"use client";

import { useState } from "react";
import { IconDownload } from "@/components/ui/Icons";

export function PartagerFichierButton({
  url,
  filename,
  mimeType,
}: {
  url: string;
  filename: string;
  mimeType: string;
}) {
  const [loading, setLoading] = useState(false);

  async function partager() {
    setLoading(true);
    try {
      const nav = navigator as Navigator & {
        canShare?: (data: { files: File[] }) => boolean;
      };
      if (nav.share) {
        const res = await fetch(url);
        const blob = await res.blob();
        const file = new File([blob], filename, {
          type: blob.type || mimeType,
        });
        if (!nav.canShare || nav.canShare({ files: [file] })) {
          await nav.share({ files: [file] });
          return;
        }
      }
      // Pas de Web Share API (ex: navigateur de bureau) : ouvre le fichier
      // dans un nouvel onglet pour un enregistrement manuel.
      window.open(url, "_blank");
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      window.open(url, "_blank");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={partager}
      disabled={loading}
      className="flex items-center gap-1 text-xs text-navy hover:underline disabled:opacity-50"
    >
      <IconDownload size={12} />
      {loading ? "..." : "Partager"}
    </button>
  );
}
