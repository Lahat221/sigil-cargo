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
 * Deux notifications au client, envoyées depuis le WhatsApp PERSONNEL de
 * l'agent : le bouton ouvre la conversation avec le numéro du client et le
 * message déjà rédigé (adapté à la ville du colis, voir
 * lib/commandes/notifications.ts) — WhatsApp montre le texte avant l'envoi.
 * Rien n'est envoyé automatiquement depuis le numéro de l'entreprise.
 */
export function NotifButtons({
  clientTelephone,
  clientTelephonePays,
  texteCommande,
  texteRetrait,
}: {
  clientTelephone: string | null;
  clientTelephonePays: string | null;
  texteCommande: string;
  texteRetrait: string;
}) {
  function ouvrir(message: string) {
    if (!clientTelephone) {
      alert("Ce client n'a pas de numéro de téléphone enregistré.");
      return;
    }
    const numeroWa = formatNumeroWhatsApp(clientTelephone, clientTelephonePays);
    window.open(`https://wa.me/${numeroWa}?text=${encodeURIComponent(message)}`, "_blank");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => ouvrir(texteCommande)}
        title="Ouvre WhatsApp avec le message « colis reçu » (ville, départ, retrait, suivi)"
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-green-700 transition-colors hover:bg-green-50"
      >
        <IconWhatsApp size={14} />
        Notif colis
      </button>
      <button
        type="button"
        onClick={() => ouvrir(texteRetrait)}
        title="Ouvre WhatsApp avec le message « prêt pour le retrait » adapté à la ville du colis"
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-green-700 transition-colors hover:bg-green-50"
      >
        <IconWhatsApp size={14} />
        Notif retrait
      </button>
    </>
  );
}
