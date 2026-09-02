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
 *
 * Le texte s'ouvre TOUJOURS en premier, de façon synchrone, dès le clic —
 * un window.open() appelé après un await (le temps de récupérer la vidéo)
 * perd l'autorisation du navigateur et se fait bloquer silencieusement en
 * tant que popup, d'où le bouton qui ne semblait "rien faire". La vidéo est
 * ensuite tentée séparément, sans jamais bloquer/retarder l'ouverture du
 * texte : dans le pire cas (partage natif non supporté, ex. ordinateur de
 * bureau, ou fenêtre d'autorisation expirée), la vidéo s'ouvre dans un
 * nouvel onglet pour un enregistrement manuel plutôt que rien du tout.
 *
 * videoPath (chemin storage brut, pas une URL déjà signée) est résolu à la
 * demande au clic — utilisable aussi bien depuis la fiche colis que depuis
 * la liste de colis (qui ne pré-génère pas d'URL signée par ligne pour
 * rester rapide).
 */
export function NotifRetraitButton({
  clientNom,
  texte,
  videoPath,
  clientTelephone,
  clientTelephonePays,
}: {
  clientNom: string;
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

  async function partagerVideo(path: string) {
    setLoading(true);
    try {
      const resultat = await signerUrlMedia(path);
      if ("error" in resultat) return;

      const nav = navigator as Navigator & {
        canShare?: (data: { files: File[] }) => boolean;
      };
      if (nav.share) {
        const res = await fetch(resultat.url);
        const blob = await res.blob();
        const filename = path.split("/").pop() ?? "video.mp4";
        const file = new File([blob], filename, { type: blob.type || "video/mp4" });
        if (!nav.canShare || nav.canShare({ files: [file] })) {
          await nav.share({ files: [file] });
          return;
        }
      }
      // Pas de partage natif disponible ou fenêtre d'autorisation expirée :
      // la vidéo s'ouvre à part pour un enregistrement manuel avant envoi.
      window.open(resultat.url, "_blank");
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
    } finally {
      setLoading(false);
    }
  }

  function notifier() {
    const confirmation = videoPath
      ? `Envoyer le message de retrait et la vidéo à ${clientNom || "ce client"} ?`
      : `Envoyer le message de retrait à ${clientNom || "ce client"} ?\n\n${texte}`;
    if (!confirm(confirmation)) return;

    ouvrirWhatsAppTexte();
    if (videoPath) {
      void partagerVideo(videoPath);
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
      {loading ? "Vidéo en cours..." : "Notif retrait (perso)"}
    </button>
  );
}
