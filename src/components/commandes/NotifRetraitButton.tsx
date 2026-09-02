"use client";

import { useState } from "react";
import { signerUrlMedia } from "@/app/(dashboard)/commandes/actions";
import { IconWhatsApp } from "@/components/ui/Icons";

function formatNumeroWhatsApp(
  telephone: string,
  telephonePays: string | null
): string {
  const chiffres = telephone.replace(/\D/g, "");
  const indicatif = (telephonePays ?? "+33").replace(/\D/g, "");
  return chiffres.startsWith(indicatif) ? chiffres : indicatif + chiffres;
}

/**
 * Message de retrait + vidéo EN PIÈCE JOINTE (pas un lien) quand c'est
 * possible : Web Share API (navigator.share avec un fichier) ouvre le
 * partage natif du téléphone, WhatsApp y apparaît comme destination et
 * envoie la vidéo elle-même. Contrepartie inévitable : contrairement à un
 * lien wa.me, le partage natif ne permet pas de pré-sélectionner le contact
 * — l'agent choisit WhatsApp puis le client dans la liste qui s'affiche.
 * Sans vidéo (ou sans support du partage natif, ex. ordinateur de bureau),
 * on retombe sur un lien wa.me classique, qui lui cible directement le
 * numéro du client.
 *
 * videoPath (chemin storage brut, pas une URL déjà signée) est résolu à la
 * demande au clic — utilisable aussi bien depuis la fiche colis (qui a déjà
 * l'URL signée pour l'affichage, mais le chemin reste plus simple à passer
 * uniformément) que depuis la liste de colis (qui ne pré-génère pas d'URL
 * signée par ligne pour rester rapide).
 */
export function NotifRetraitButton({
  texte,
  videoPath,
  clientTelephone,
  clientTelephonePays,
}: {
  texte: string;
  videoPath: string | null;
  clientTelephone: string | null;
  clientTelephonePays: string | null;
}) {
  const [loading, setLoading] = useState(false);

  if (!clientTelephone) return null;

  function ouvrirWhatsAppTexte() {
    const numeroWa = formatNumeroWhatsApp(clientTelephone!, clientTelephonePays);
    window.open(`https://wa.me/${numeroWa}?text=${encodeURIComponent(texte)}`, "_blank");
  }

  async function notifier() {
    if (!videoPath) {
      ouvrirWhatsAppTexte();
      return;
    }

    setLoading(true);
    try {
      const resultat = await signerUrlMedia(videoPath);
      if ("error" in resultat) {
        ouvrirWhatsAppTexte();
        return;
      }

      const nav = navigator as Navigator & {
        canShare?: (data: { files: File[] }) => boolean;
      };
      if (nav.share) {
        const res = await fetch(resultat.url);
        const blob = await res.blob();
        const filename = videoPath.split("/").pop() ?? "video.mp4";
        const file = new File([blob], filename, { type: blob.type || "video/mp4" });
        if (!nav.canShare || nav.canShare({ files: [file] })) {
          await nav.share({ files: [file], text: texte });
          return;
        }
      }
      // Pas de partage natif disponible (ex. ordinateur de bureau) : le
      // texte part quand même vers le bon contact, la vidéo s'ouvre à part
      // pour un enregistrement manuel avant envoi.
      ouvrirWhatsAppTexte();
      window.open(resultat.url, "_blank");
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      ouvrirWhatsAppTexte();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={notifier}
      disabled={loading}
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-green-700 transition-colors hover:bg-green-50 disabled:opacity-50"
    >
      <IconWhatsApp size={14} />
      {loading ? "..." : "Notif retrait (perso)"}
    </button>
  );
}
