"use client";

import { useTransition } from "react";
import { queuerNotification } from "@/app/(dashboard)/commandes/actions";

export function NotifButtons({ commandeId }: { commandeId: string }) {
  const [isPending, startTransition] = useTransition();

  function envoyer(statut: "recue" | "prete", label: string) {
    startTransition(async () => {
      const result = await queuerNotification(commandeId, statut);
      if ("error" in result) {
        alert("Erreur : " + result.error);
        return;
      }
      alert(`Notification "${label}" mise en file d'attente.`);
    });
  }

  return (
    <>
      <button
        type="button"
        disabled={isPending}
        onClick={() => envoyer("recue", "commande reçue")}
        className="text-sm text-slate-600 hover:underline disabled:opacity-50"
      >
        Notif commande
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => envoyer("prete", "prêt pour retrait")}
        className="text-sm text-slate-600 hover:underline disabled:opacity-50"
      >
        Notif retrait
      </button>
    </>
  );
}
