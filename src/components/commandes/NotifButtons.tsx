"use client";

import { useState, useTransition } from "react";
import { envoyerNotificationCommande } from "@/app/(dashboard)/commandes/actions";
import { IconWhatsApp } from "@/components/ui/Icons";
import { BRAND } from "@/lib/brand"; // cache-bust: force recompile after BRAND fix

const montantFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: BRAND.devise,
});

function formatNumeroWhatsApp(
  telephone: string,
  telephonePays: string | null
): string {
  const chiffres = telephone.replace(/\D/g, "");
  const indicatif = (telephonePays ?? "+33").replace(/\D/g, "");
  return chiffres.startsWith(indicatif) ? chiffres : indicatif + chiffres;
}

export function NotifButtons({
  commandeId,
  numero,
  clientNom,
  clientTelephone,
  clientTelephonePays,
  poidsKg,
  montantTotal,
  description,
}: {
  commandeId: string;
  numero: number;
  clientNom: string;
  clientTelephone: string | null;
  clientTelephonePays: string | null;
  poidsKg: number | null;
  montantTotal: number;
  description?: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);

  function envoyerManuellement(message: string) {
    if (!clientTelephone) return;
    const numeroWa = formatNumeroWhatsApp(clientTelephone, clientTelephonePays);
    window.open(
      `https://wa.me/${numeroWa}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  }

  function envoyer(statut: "recue" | "prete", message: string) {
    if (!clientTelephone) {
      alert("Ce client n'a pas de numéro de téléphone enregistré.");
      return;
    }
    if (!confirm(`Envoyer ce message WhatsApp à ${clientNom} ?\n\n${message}`)) {
      return;
    }
    setErreur(null);
    startTransition(async () => {
      const result = await envoyerNotificationCommande(
        commandeId,
        statut,
        message
      );
      if ("error" in result) {
        // Twilio pas configuré ou envoi impossible (ex: hors fenêtre 24h) :
        // on retombe sur l'ouverture manuelle de WhatsApp.
        if (!result.error.includes("n'est pas configuré")) {
          setErreur(result.error);
        }
        envoyerManuellement(message);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          envoyer(
            "recue",
            `Bonjour ${clientNom}, nous avons bien reçu votre colis #${numero} chez ${BRAND.nom} (${poidsKg !== null ? `${poidsKg} kg, ` : ""}${montantFormatter.format(montantTotal)})${description?.trim() ? ` : ${description.trim()}` : ""}. Merci !`
          )
        }
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-green-700 transition-colors hover:bg-green-50 disabled:opacity-50"
      >
        <IconWhatsApp size={14} />
        {isPending ? "..." : "Notif colis"}
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          envoyer(
            "prete",
            `Bonjour ${clientNom}, votre colis #${numero} est prêt pour le retrait chez ${BRAND.nom}. À bientôt !`
          )
        }
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-green-700 transition-colors hover:bg-green-50 disabled:opacity-50"
      >
        <IconWhatsApp size={14} />
        {isPending ? "..." : "Notif retrait"}
      </button>
      {erreur && (
        <p className="w-full text-xs text-amber-600">
          Envoi auto échoué ({erreur}) — ouverture manuelle de WhatsApp.
        </p>
      )}
    </>
  );
}
