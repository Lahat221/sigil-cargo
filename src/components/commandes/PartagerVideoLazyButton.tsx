"use client";

import { useState } from "react";
import { signerUrlMedia } from "@/app/(dashboard)/commandes/actions";
import { IconWhatsApp } from "@/components/ui/Icons";

/**
 * Bouton "Vidéo" séparé de "Notif retrait (perso)" — partage la vidéo du
 * colis en pièce jointe via le partage natif du téléphone (comme
 * PartagerFichierButton), mais résout l'URL signée À LA DEMANDE à partir
 * d'un chemin storage brut, pour la liste de colis qui n'en pré-génère pas
 * une par ligne (coûteux si beaucoup de colis ont une vidéo). Deux clics
 * séparés (texte, puis vidéo) plutôt qu'un seul combiné : voir
 * NotifRetraitButton pour pourquoi la combinaison ne marchait pas.
 */
export function PartagerVideoLazyButton({ videoPath }: { videoPath: string }) {
  const [loading, setLoading] = useState(false);

  async function partager() {
    setLoading(true);
    try {
      const resultat = await signerUrlMedia(videoPath);
      if ("error" in resultat) {
        alert("Vidéo introuvable : " + resultat.error);
        return;
      }

      const filename = videoPath.split("/").pop() ?? "video.mp4";
      const nav = navigator as Navigator & {
        canShare?: (data: { files: File[] }) => boolean;
      };
      if (nav.share) {
        const res = await fetch(resultat.url);
        const blob = await res.blob();
        const file = new File([blob], filename, { type: blob.type || "video/mp4" });
        if (!nav.canShare || nav.canShare({ files: [file] })) {
          await nav.share({ files: [file] });
          return;
        }
      }
      // Pas de partage natif (ex. ordinateur de bureau) : ouvre la vidéo
      // dans un nouvel onglet pour un enregistrement manuel.
      window.open(resultat.url, "_blank");
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={partager}
      disabled={loading}
      title="Partager la vidéo du colis (pièce jointe, pas un lien)"
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-green-700 transition-colors hover:bg-green-50 disabled:opacity-50"
    >
      <IconWhatsApp size={14} />
      {loading ? "..." : "+ Vidéo"}
    </button>
  );
}
