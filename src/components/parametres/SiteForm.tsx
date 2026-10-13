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
          Adresse de retrait (France)
        </label>
        <input
          value={valeurs.adresse}
          onChange={(e) => maj("adresse", e.target.value)}
          className={INPUT_CLASS}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Adresse du point de dépôt (Dakar)
        </label>
        <input
          value={valeurs.adresseDakar}
          onChange={(e) => maj("adresseDakar", e.target.value)}
          placeholder="Quartier, rue, ville"
          className={INPUT_CLASS}
        />
        <p className="mt-1 text-xs text-slate-500">
          Affichée sur le site public comme lieu de dépôt des colis.
        </p>
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
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Villes annoncées « bientôt »
        </label>
        <input
          value={valeurs.destinationsBientot}
          onChange={(e) => maj("destinationsBientot", e.target.value)}
          placeholder="Bordeaux, Toulouse, Lille..."
          className={INPUT_CLASS}
        />
        <p className="mt-1 text-xs text-slate-500">
          Séparées par des virgules. Affichées dans « Prochaines destinations » sur
          la page d&apos;accueil (sans prix ni calculateur tant qu&apos;elles ne sont pas
          ouvertes dans l&apos;onglet Tarifs).
        </p>
      </div>
      <div className="border-t border-slate-100 pt-4">
        <p className="mb-1 text-sm font-medium text-slate-700">
          Chiffres clés du site (cumul depuis vos débuts)
        </p>
        <p className="mb-3 text-xs text-slate-500">
          L&apos;application ne connaît que l&apos;activité enregistrée depuis son
          lancement. Saisissez ici vos totaux réels depuis le début (y compris avant
          l&apos;appli) : le site affiche le plus élevé entre ce chiffre et le compte
          en direct, avec un « + ». Laissez vide pour n&apos;afficher que le direct.
          Ces chiffres doivent rester exacts.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Kilos acheminés (kg)
            </label>
            <input
              inputMode="decimal"
              value={valeurs.chiffresKg}
              onChange={(e) => maj("chiffresKg", e.target.value)}
              placeholder="Ex. 5000"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Clients
            </label>
            <input
              inputMode="numeric"
              value={valeurs.chiffresClients}
              onChange={(e) => maj("chiffresClients", e.target.value)}
              placeholder="Ex. 300"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Départs organisés
            </label>
            <input
              inputMode="numeric"
              value={valeurs.chiffresDeparts}
              onChange={(e) => maj("chiffresDeparts", e.target.value)}
              placeholder="Ex. 20"
              className={INPUT_CLASS}
            />
          </div>
        </div>
      </div>
      <div className="border-t border-slate-100 pt-4">
        <p className="mb-1 text-sm font-medium text-slate-700">
          Règles de prix du calculateur (site public)
        </p>
        <p className="mb-3 text-xs text-slate-500">
          Au-dessus du seuil, le tarif/kg de la destination s&apos;applique (voir
          l&apos;onglet Tarifs). Au-dessous, les colis sont facturés au tarif « petit
          colis ». Les enveloppes (documents) sont au forfait.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Seuil petit colis (kg)
            </label>
            <input
              inputMode="decimal"
              value={valeurs.seuilPetitColisKg}
              onChange={(e) => maj("seuilPetitColisKg", e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Petit colis (€/kg)
            </label>
            <input
              inputMode="decimal"
              value={valeurs.petitColisParKg}
              onChange={(e) => maj("petitColisParKg", e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Forfait enveloppe (€)
            </label>
            <input
              inputMode="decimal"
              value={valeurs.forfaitEnveloppe}
              onChange={(e) => maj("forfaitEnveloppe", e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
        </div>
      </div>
      <MessageForm message={message} />
      <button type="submit" disabled={isPending} className={BOUTON_PRIMAIRE}>
        {isPending ? "Enregistrement..." : "Enregistrer"}
      </button>
    </form>
  );
}
