"use client";

import { useState, useTransition, type FormEvent } from "react";
import { sauvegarderParametresSite } from "@/app/(dashboard)/parametres/actions";
import type { ParametresSite } from "@/lib/parametres";
import { MessageForm } from "./MonCompteForms";
import { BOUTON_PRIMAIRE, INPUT_CLASS } from "./styles";

export function SiteForm({ initial }: { initial: ParametresSite }) {
  const [valeurs, setValeurs] = useState(initial);
  const [message, setMessage] = useState<{ type: "ok" | "erreur"; texte: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function maj<K extends keyof ParametresSite>(cle: K, valeur: string) {
    setValeurs((v) => ({ ...v, [cle]: valeur }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const r = await sauvegarderParametresSite(valeurs);
      setMessage(
        "error" in r
          ? { type: "erreur", texte: r.error }
          : { type: "ok", texte: "Enregistré — visible tout de suite sur le site public." }
      );
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Numéro WhatsApp
        </label>
        <input
          value={valeurs.whatsapp}
          onChange={(e) => maj("whatsapp", e.target.value)}
          placeholder="+221 77 000 00 00"
          className={INPUT_CLASS}
        />
        <p className="mt-1 text-xs text-slate-500">
          Format international. Alimente le bouton « Contacter sur WhatsApp » ;
          laisser vide pour le masquer.
        </p>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Adresse (point de dépôt / retrait)
        </label>
        <input
          value={valeurs.adresse}
          onChange={(e) => maj("adresse", e.target.value)}
          className={INPUT_CLASS}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Horaires</label>
        <input
          value={valeurs.horaires}
          onChange={(e) => maj("horaires", e.target.value)}
          placeholder="Ex. 17h à 20h30"
          className={INPUT_CLASS}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Email de contact (optionnel)
        </label>
        <input
          type="email"
          value={valeurs.email}
          onChange={(e) => maj("email", e.target.value)}
          className={INPUT_CLASS}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Adresse du site web (imprimée sur les étiquettes)
        </label>
        <input
          value={valeurs.siteWeb}
          onChange={(e) => maj("siteWeb", e.target.value)}
          placeholder="www.sigilcargo.com"
          className={INPUT_CLASS}
        />
        <p className="mt-1 text-xs text-slate-500">
          Affichée en bas de chaque étiquette colis pour le suivi et les
          informations. Vide : l&apos;adresse utilisée pour ouvrir l&apos;appli.
        </p>
      </div>
      <MessageForm message={message} />
      <button type="submit" disabled={isPending} className={BOUTON_PRIMAIRE}>
        {isPending ? "Enregistrement..." : "Enregistrer"}
      </button>
    </form>
  );
}
