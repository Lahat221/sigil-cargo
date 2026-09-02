"use client";

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
 * Message de retrait, texte seul — ouvre WhatsApp avec le numéro du client
 * déjà rempli. Volontairement SANS logique vidéo (cf. PartagerVideoButton,
 * bouton séparé juste à côté) : deux essais précédents qui tentaient de
 * combiner texte + partage natif du fichier vidéo dans le même clic ont
 * échoué en pratique (window.open() et navigator.share() se disputent la
 * même autorisation "geste utilisateur" d'un clic, et navigator.share avec
 * fichier n'est de toute façon fiable que sur mobile). Deux boutons, deux
 * clics, chacun garanti de fonctionner plutôt qu'une combinaison fragile.
 */
export function NotifRetraitButton({
  clientNom,
  texte,
  clientTelephone,
  clientTelephonePays,
}: {
  clientNom: string;
  texte: string;
  clientTelephone: string | null;
  clientTelephonePays: string | null;
}) {
  if (!clientTelephone) return null;

  function notifier() {
    if (!confirm(`Envoyer le message de retrait à ${clientNom || "ce client"} ?\n\n${texte}`)) {
      return;
    }
    const numeroWa = formatNumeroWhatsApp(clientTelephone!, clientTelephonePays);
    window.open(`https://wa.me/${numeroWa}?text=${encodeURIComponent(texte)}`, "_blank");
  }

  return (
    <button
      type="button"
      onClick={notifier}
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-green-700 transition-colors hover:bg-green-50"
    >
      <IconWhatsApp size={14} />
      Notif retrait (perso)
    </button>
  );
}
