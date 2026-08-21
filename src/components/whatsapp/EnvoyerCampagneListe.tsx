"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  envoyerMessageWhatsApp,
  marquerEnvoye,
} from "@/app/(dashboard)/notifications-whatsapp/actions";
import { IconWhatsApp } from "@/components/ui/Icons";

type Destinataire = {
  id: string;
  envoyee: boolean;
  erreur?: string | null;
  clients: { nom: string; telephone: string | null; telephone_pays: string | null } | null;
};

function formatNumeroWhatsApp(
  telephone: string,
  telephonePays: string | null
): string {
  const chiffres = telephone.replace(/\D/g, "");
  const indicatif = (telephonePays ?? "+33").replace(/\D/g, "");
  return chiffres.startsWith(indicatif) ? chiffres : indicatif + chiffres;
}

export function EnvoyerCampagneListe({
  destinataires,
  message,
}: {
  destinataires: Destinataire[];
  message: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [erreurs, setErreurs] = useState<Record<string, string>>({});

  function envoyerManuellement(d: Destinataire) {
    if (!d.clients?.telephone) return;
    const numeroWa = formatNumeroWhatsApp(
      d.clients.telephone,
      d.clients.telephone_pays
    );
    const texte = message.replace(/\{nom\}/gi, d.clients.nom);
    window.open(
      `https://wa.me/${numeroWa}?text=${encodeURIComponent(texte)}`,
      "_blank"
    );
    setPendingId(d.id);
    startTransition(async () => {
      await marquerEnvoye(d.id);
      router.refresh();
      setPendingId(null);
    });
  }

  function envoyer(d: Destinataire) {
    if (!d.clients?.telephone) return;
    setErreurs((prev) => {
      const next = { ...prev };
      delete next[d.id];
      return next;
    });
    setPendingId(d.id);
    startTransition(async () => {
      const result = await envoyerMessageWhatsApp(d.id);
      if ("error" in result) {
        if (result.error.includes("n'est pas configuré")) {
          // Twilio pas encore prêt : on retombe sur l'ouverture manuelle de WhatsApp.
          envoyerManuellement(d);
          return;
        }
        setErreurs((prev) => ({ ...prev, [d.id]: result.error }));
        setPendingId(null);
        return;
      }
      router.refresh();
      setPendingId(null);
    });
  }

  return (
    <div className="divide-y divide-slate-100">
      {destinataires.map((d) => (
        <div
          key={d.id}
          className="flex items-center justify-between gap-3 py-2.5 text-sm"
        >
          <div className="min-w-0">
            <p className="font-medium text-slate-900">
              {d.clients?.nom ?? "—"}
            </p>
            <p className="text-slate-500">{d.clients?.telephone ?? "—"}</p>
            {(erreurs[d.id] ?? d.erreur) && (
              <p className="mt-0.5 truncate text-xs text-red-600">
                {erreurs[d.id] ?? d.erreur}
              </p>
            )}
          </div>
          {d.envoyee ? (
            <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
              Envoyé
            </span>
          ) : (
            <button
              type="button"
              disabled={isPending || !d.clients?.telephone}
              onClick={() => envoyer(d)}
              className="flex shrink-0 items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
            >
              <IconWhatsApp size={13} />
              {isPending && pendingId === d.id ? "..." : "Envoyer"}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
