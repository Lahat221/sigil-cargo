"use client";

import { useEffect, useState } from "react";
import { IconCopy, IconWhatsApp } from "@/components/ui/Icons";

function formatNumeroWhatsApp(
  telephone: string,
  telephonePays: string | null
): string {
  const chiffres = telephone.replace(/\D/g, "");
  const indicatif = (telephonePays ?? "+33").replace(/\D/g, "");
  return chiffres.startsWith(indicatif) ? chiffres : indicatif + chiffres;
}

/** Copie dans le presse-papiers ; repli pour les navigateurs sans API Clipboard (page non sécurisée). */
async function copierTexte(texte: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texte);
    return true;
  } catch {
    try {
      const zone = document.createElement("textarea");
      zone.value = texte;
      zone.style.position = "fixed";
      zone.style.opacity = "0";
      document.body.appendChild(zone);
      zone.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(zone);
      return ok;
    } catch {
      return false;
    }
  }
}

type Message = "commande" | "retrait";

function BoutonCopier({ fait, onCopier }: { fait: boolean; onCopier: () => void }) {
  return (
    <button
      type="button"
      onClick={onCopier}
      title="Copier le message (à coller où vous voulez)"
      aria-label="Copier le message"
      className={`flex items-center gap-1 rounded-md px-1.5 py-1.5 text-xs transition-colors ${
        fait ? "text-emerald-700" : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
      }`}
    >
      <IconCopy size={13} />
      {fait ? "Copié ✓" : "Copier"}
    </button>
  );
}

/**
 * Deux notifications au client, envoyées depuis le WhatsApp PERSONNEL de
 * l'agent : le bouton ouvre la conversation avec le numéro du client et le
 * message déjà rédigé (adapté à la ville du colis, voir
 * lib/commandes/notifications.ts) — WhatsApp montre le texte avant l'envoi.
 * Chaque message peut aussi être copié (pour le coller ailleurs : autre
 * conversation, SMS, groupe...). Rien n'est envoyé automatiquement.
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
  const [copie, setCopie] = useState<Message | "echec" | null>(null);

  // Le « Copié ✓ » disparaît tout seul.
  useEffect(() => {
    if (!copie) return;
    const minuteur = setTimeout(() => setCopie(null), 2000);
    return () => clearTimeout(minuteur);
  }, [copie]);

  function ouvrir(message: string) {
    if (!clientTelephone) {
      alert("Ce client n'a pas de numéro de téléphone enregistré.");
      return;
    }
    const numeroWa = formatNumeroWhatsApp(clientTelephone, clientTelephonePays);
    window.open(`https://wa.me/${numeroWa}?text=${encodeURIComponent(message)}`, "_blank");
  }

  async function copier(quel: Message, texte: string) {
    setCopie((await copierTexte(texte)) ? quel : "echec");
  }

  return (
    <>
      <span className="inline-flex items-center">
        <button
          type="button"
          onClick={() => ouvrir(texteCommande)}
          title="Ouvre WhatsApp avec le message « colis reçu » (ville, retrait, suivi)"
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-green-700 transition-colors hover:bg-green-50"
        >
          <IconWhatsApp size={14} />
          Notif colis
        </button>
        <BoutonCopier fait={copie === "commande"} onCopier={() => copier("commande", texteCommande)} />
      </span>
      <span className="inline-flex items-center">
        <button
          type="button"
          onClick={() => ouvrir(texteRetrait)}
          title="Ouvre WhatsApp avec le message « prêt pour le retrait » adapté à la ville du colis"
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-green-700 transition-colors hover:bg-green-50"
        >
          <IconWhatsApp size={14} />
          Notif retrait
        </button>
        <BoutonCopier fait={copie === "retrait"} onCopier={() => copier("retrait", texteRetrait)} />
      </span>
      {copie === "echec" && (
        <span className="text-xs text-amber-600">Copie impossible sur ce navigateur.</span>
      )}
    </>
  );
}
