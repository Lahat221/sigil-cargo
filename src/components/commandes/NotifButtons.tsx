"use client";

import { useTransition } from "react";
import { queuerNotification } from "@/app/(dashboard)/commandes/actions";
import { IconWhatsApp } from "@/components/ui/Icons";

const montantFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
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
}: {
  commandeId: string;
  numero: number;
  clientNom: string;
  clientTelephone: string | null;
  clientTelephonePays: string | null;
  poidsKg: number;
  montantTotal: number;
}) {
  const [isPending, startTransition] = useTransition();

  function envoyer(statut: "recue" | "prete", message: string) {
    if (!clientTelephone) {
      alert("Ce client n'a pas de numéro de téléphone enregistré.");
      return;
    }
    const numeroWa = formatNumeroWhatsApp(clientTelephone, clientTelephonePays);
    window.open(
      `https://wa.me/${numeroWa}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
    startTransition(async () => {
      await queuerNotification(commandeId, statut);
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
            `Bonjour ${clientNom}, nous avons bien reçu votre commande #${numero} chez SIGIL CARGO (${poidsKg} kg, ${montantFormatter.format(montantTotal)}). Merci !`
          )
        }
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-green-700 transition-colors hover:bg-green-50 disabled:opacity-50"
      >
        <IconWhatsApp size={14} />
        Notif commande
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          envoyer(
            "prete",
            `Bonjour ${clientNom}, votre commande #${numero} est prête pour le retrait chez SIGIL CARGO. À bientôt !`
          )
        }
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-green-700 transition-colors hover:bg-green-50 disabled:opacity-50"
      >
        <IconWhatsApp size={14} />
        Notif retrait
      </button>
    </>
  );
}
