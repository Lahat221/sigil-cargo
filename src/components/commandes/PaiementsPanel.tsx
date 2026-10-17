"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ajouterPaiement,
  supprimerPaiement,
} from "@/app/(dashboard)/commandes/paiements/actions";
import {
  LIBELLES_STATUT_PAIEMENT,
  formaterAvecEquivalent,
  formaterMontant,
  libelleMode,
  resumePaiements,
  type PaiementLigne,
  type StatutPaiement,
} from "@/lib/paiements";
import {
  PaiementSaisie,
  SAISIE_VIDE,
  saisieVersInput,
  type SaisiePaiement,
} from "./PaiementSaisie";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
});

export const STYLE_STATUT_PAIEMENT: Record<StatutPaiement, string> = {
  impaye: "bg-red-50 text-red-700 ring-red-200",
  acompte: "bg-amber-50 text-amber-800 ring-amber-200",
  solde: "bg-green-50 text-green-700 ring-green-200",
};

export function PaiementsPanel({
  commandeId,
  montantTotal,
  paiements,
}: {
  commandeId: string;
  montantTotal: number;
  paiements: PaiementLigne[];
}) {
  const router = useRouter();
  const [saisie, setSaisie] = useState<SaisiePaiement>(SAISIE_VIDE);
  const [erreur, setErreur] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const resume = resumePaiements(montantTotal, paiements);

  function encaisser() {
    setErreur(null);
    const input = saisieVersInput(saisie);
    if (!input) {
      setErreur("Indiquez le montant encaissé.");
      return;
    }
    startTransition(async () => {
      const r = await ajouterPaiement(commandeId, input);
      if ("error" in r) setErreur(r.error);
      else {
        setSaisie(SAISIE_VIDE);
        router.refresh();
      }
    });
  }

  function supprimer(id: string) {
    if (!window.confirm("Supprimer ce paiement ?")) return;
    setErreur(null);
    startTransition(async () => {
      const r = await supprimerPaiement(id, commandeId);
      if ("error" in r) setErreur(r.error);
      else router.refresh();
    });
  }

  return (
    <div className="mb-6 rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-slate-700">Paiements</h2>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${STYLE_STATUT_PAIEMENT[resume.statut]}`}
        >
          {LIBELLES_STATUT_PAIEMENT[resume.statut]}
        </span>
      </div>

      <div className="mb-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
        <div>
          <p className="text-slate-500">Montant du colis</p>
          <p className="font-medium text-slate-900">{formaterAvecEquivalent(montantTotal)}</p>
        </div>
        <div>
          <p className="text-slate-500">Déjà payé</p>
          <p className="font-medium text-slate-900">
            {resume.paye > 0 ? formaterAvecEquivalent(resume.paye) : "—"}
          </p>
        </div>
        <div>
          <p className="text-slate-500">Reste à payer</p>
          <p className={`font-semibold ${resume.reste > 0 ? "text-red-700" : "text-green-700"}`}>
            {resume.reste > 0 ? formaterAvecEquivalent(resume.reste) : "0 — soldé"}
          </p>
        </div>
      </div>

      {paiements.length > 0 && (
        <ul className="mb-4 divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">
          {paiements.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <span>
                <span className="font-medium text-slate-900">
                  {formaterMontant(p.montant, p.devise)}
                </span>
                <span className="text-slate-500">
                  {" "}
                  · {libelleMode(p.mode)} · {dateFormatter.format(new Date(p.created_at))}
                  {p.note && ` · ${p.note}`}
                </span>
              </span>
              <button
                type="button"
                onClick={() => supprimer(p.id)}
                disabled={isPending}
                className="text-xs text-slate-400 hover:text-red-600 disabled:opacity-50"
              >
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      )}

      {resume.reste > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Encaisser un paiement</p>
          <PaiementSaisie
            valeur={saisie}
            onChange={setSaisie}
            cible={resume.reste}
            libelleCible="Reste à payer"
          />
          <button
            type="button"
            onClick={encaisser}
            disabled={isPending}
            className="rounded-lg bg-gold-gradient px-4 py-2 text-sm font-semibold text-navy shadow-sm transition-all hover:shadow-md hover:brightness-105 disabled:opacity-50"
          >
            {isPending ? "Enregistrement..." : "Enregistrer le paiement"}
          </button>
        </div>
      )}

      {erreur && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {erreur}
        </p>
      )}
    </div>
  );
}
