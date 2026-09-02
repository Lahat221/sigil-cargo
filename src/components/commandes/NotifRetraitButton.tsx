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
 * possible : Web Share API (navigator.share avec un fichier ET le texte
 * dans le même appel) ouvre le partage natif du téléphone, WhatsApp y
 * apparaît comme destination et envoie la vidéo + le texte ensemble.
 * Contrepartie inévitable : contrairement à un lien wa.me, le partage
 * natif ne permet pas de pré-sélectionner le contact — l'agent choisit
 * WhatsApp puis le client dans la liste qui s'affiche.
 *
 * IMPORTANT (leçon du premier essai qui ne marchait pas) : un clic ne
 * donne au navigateur qu'UNE seule autorisation "geste utilisateur", et
 * window.open() ET navigator.share() la consomment chacun. Appeler les
 * deux dans le même clic (même l'un après l'autre, même sans await entre
 * les deux) fait échouer silencieusement le second — d'où "ça marche
 * [le texte s'ouvre] mais y'a aucune vidéo" quand on les avait combinés.
 * Solution : quand il y a une vidéo, UN SEUL appel natif (navigator.share
 * avec files + text) — jamais de window.open à côté. Sans vidéo, on garde
 * le simple window.open (aucun conflit, c'est le seul appel).
 *
 * videoUrl (déjà résolue, ex. fiche colis qui l'a déjà pour l'affichage)
 * évite un aller-retour réseau supplémentaire avant navigator.share — sur
 * la liste de colis (qui ne pré-génère pas d'URL signée par ligne), on
 * passe videoPath à la place et il est résolu à la demande.
 */
export function NotifRetraitButton({
  clientNom,
  texte,
  videoPath = null,
  videoUrl = null,
  clientTelephone,
  clientTelephonePays,
}: {
  clientNom: string;
  texte: string;
  videoPath?: string | null;
  videoUrl?: string | null;
  clientTelephone: string | null;
  clientTelephonePays: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const hasVideo = !!(videoUrl || videoPath);

  if (!clientTelephone) return null;

  function ouvrirWhatsAppTexte() {
    const numeroWa = formatNumeroWhatsApp(clientTelephone!, clientTelephonePays);
    window.open(`https://wa.me/${numeroWa}?text=${encodeURIComponent(texte)}`, "_blank");
  }

  async function envoyerAvecVideo() {
    setLoading(true);
    try {
      let resolvedUrl: string | null = videoUrl;
      if (!resolvedUrl && videoPath) {
        const resultat = await signerUrlMedia(videoPath);
        resolvedUrl = "error" in resultat ? null : resultat.url;
      }
      if (!resolvedUrl) {
        ouvrirWhatsAppTexte();
        return;
      }

      const nav = navigator as Navigator & {
        canShare?: (data: { files: File[] }) => boolean;
      };
      if (nav.share) {
        const res = await fetch(resolvedUrl);
        const blob = await res.blob();
        const filename = (videoPath ?? resolvedUrl).split("/").pop()?.split("?")[0] ?? "video.mp4";
        const file = new File([blob], filename, { type: blob.type || "video/mp4" });
        if (!nav.canShare || nav.canShare({ files: [file] })) {
          await nav.share({ files: [file], text: texte });
          return;
        }
      }
      // Pas de partage natif disponible (ex. ordinateur de bureau) : au
      // moins un des deux doit encore atteindre le client, le texte passe
      // en priorité (le lien direct vers le bon numéro), la vidéo s'ouvre
      // à part pour un enregistrement manuel avant envoi.
      ouvrirWhatsAppTexte();
      window.open(resolvedUrl, "_blank");
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      ouvrirWhatsAppTexte();
    } finally {
      setLoading(false);
    }
  }

  function notifier() {
    const confirmation = hasVideo
      ? `Envoyer le message de retrait et la vidéo à ${clientNom || "ce client"} ?`
      : `Envoyer le message de retrait à ${clientNom || "ce client"} ?\n\n${texte}`;
    if (!confirm(confirmation)) return;

    if (hasVideo) {
      void envoyerAvecVideo();
    } else {
      ouvrirWhatsAppTexte();
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
