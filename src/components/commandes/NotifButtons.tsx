"use client";

import { useTransition } from "react";
import { queuerNotification } from "@/app/(dashboard)/commandes/actions";
import { IconBell } from "@/components/ui/Icons";

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
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50"
      >
        <IconBell size={14} />
        Notif commande
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => envoyer("prete", "prêt pour retrait")}
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50"
      >
        <IconBell size={14} />
        Notif retrait
      </button>
    </>
  );
}
