"use client";

import { useState, useTransition } from "react";
import { auditerDeclarationFrance } from "@/app/(dashboard)/gestion-douaniere/dedouanement-france/actions";
import type { AuditReport } from "@/lib/dedouanement-france/schema";

const montantFormatter = new Intl.NumberFormat("fr-FR");

function AlerteCard({
  niveau,
  produit,
  raison,
  action,
  hs,
  lignes,
  couleur,
}: {
  niveau: string;
  produit: string;
  raison: string;
  action: string;
  hs?: string;
  lignes?: string;
  couleur: "red" | "amber" | "yellow";
}) {
  const styles = {
    red: "border-red-200 bg-red-50",
    amber: "border-amber-200 bg-amber-50",
    yellow: "border-yellow-200 bg-yellow-50",
  }[couleur];

  return (
    <div className={`rounded-md border px-3 py-2 text-sm ${styles}`}>
      <p className="font-medium text-slate-800">
        {niveau} {produit}
        {hs && <span className="ml-1 font-mono text-xs text-slate-500">({hs})</span>}
      </p>
      {lignes && <p className="text-xs text-slate-500">Lignes source : {lignes}</p>}
      <p className="mt-1 text-slate-700">{raison}</p>
      <p className="mt-1 font-medium text-slate-800">→ {action}</p>
    </div>
  );
}

export function AuditReportPanel({ projetId }: { projetId: string }) {
  const [isPending, startTransition] = useTransition();
  const [resultat, setResultat] = useState<{ ok: true; audit: AuditReport } | { error: string } | null>(null);

  function lancer() {
    setResultat(null);
    startTransition(async () => {
      const r = await auditerDeclarationFrance(projetId);
      setResultat(r);
    });
  }

  const audit = resultat && "ok" in resultat ? resultat.audit : null;

  return (
    <div className="rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-slate-700">Audit produits à risque (Aïda)</p>
          <p className="text-xs text-slate-400">
            Repère les produits interdits/réglementés/ambigus avant de générer les documents finaux.
          </p>
        </div>
        <button
          type="button"
          onClick={lancer}
          disabled={isPending}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
        >
          {isPending ? "Audit en cours..." : audit ? "Relancer l'audit" : "Lancer l'audit"}
        </button>
      </div>

      {resultat && "error" in resultat && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {resultat.error}
        </p>
      )}

      {audit && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-md bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Valeur déclarée</p>
              <p className="font-semibold text-navy">
                {montantFormatter.format(audit.resume_expedition.valeur_totale_declaree_fcfa)} FCFA
              </p>
              <p className="text-xs text-slate-400">
                {audit.resume_expedition.valeur_totale_declaree_eur.toFixed(2)} €
              </p>
            </div>
            <div className="rounded-md bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Poids LTA</p>
              <p className="font-semibold text-navy">{audit.resume_expedition.poids_lta_kg} kg</p>
            </div>
            <div className="rounded-md bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Regroupement proposé</p>
              <p className="font-semibold text-navy">
                {audit.regroupement_propose.nb_lignes_apres_retrait_et_regroupement}{" "}
                <span className="text-xs font-normal text-slate-400">
                  (vs {audit.regroupement_propose.nb_lignes_brutes})
                </span>
              </p>
              <p className="text-xs text-emerald-600">
                -{audit.regroupement_propose.economie_transitaire_eur} € transitaire
              </p>
            </div>
            <div className="rounded-md bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Part REX estimée</p>
              <p className="font-semibold text-navy">{audit.regroupement_propose.part_rex_pct.toFixed(1)}%</p>
            </div>
          </div>

          {audit.alertes_critiques.length > 0 && (
            <div>
              <p className="mb-1.5 text-sm font-medium text-red-700">
                🔴 Interdit — {audit.alertes_critiques.length} ligne(s)
              </p>
              <div className="space-y-2">
                {audit.alertes_critiques.map((a, i) => (
                  <AlerteCard
                    key={i}
                    niveau={a.niveau}
                    produit={a.produit}
                    raison={a.raison}
                    action={a.action_recommandee}
                    hs={a.hs}
                    lignes={
                      a.ligne_source != null
                        ? String(a.ligne_source)
                        : a.lignes_source?.join(", ")
                    }
                    couleur="red"
                  />
                ))}
              </div>
            </div>
          )}

          {audit.alertes_reglementation.length > 0 && (
            <div>
              <p className="mb-1.5 text-sm font-medium text-amber-700">
                🟠 Réglementation stricte — {audit.alertes_reglementation.length} ligne(s)
              </p>
              <div className="space-y-2">
                {audit.alertes_reglementation.map((a, i) => (
                  <AlerteCard
                    key={i}
                    niveau={a.niveau}
                    produit={a.produit}
                    raison={a.raison}
                    action={a.action_recommandee}
                    hs={a.hs}
                    lignes={
                      a.ligne_source != null
                        ? String(a.ligne_source)
                        : a.lignes_source?.join(", ")
                    }
                    couleur="amber"
                  />
                ))}
              </div>
            </div>
          )}

          {audit.alertes_ambigues.length > 0 && (
            <div>
              <p className="mb-1.5 text-sm font-medium text-yellow-700">
                🟡 À reformuler — {audit.alertes_ambigues.length} ligne(s)
              </p>
              <div className="space-y-2">
                {audit.alertes_ambigues.map((a, i) => (
                  <AlerteCard
                    key={i}
                    niveau={a.niveau}
                    produit={a.produit}
                    raison={a.raison}
                    action={a.action_recommandee}
                    hs={a.hs_source ?? a.hs}
                    lignes={
                      a.ligne_source != null
                        ? String(a.ligne_source)
                        : a.lignes_source?.join(", ")
                    }
                    couleur="yellow"
                  />
                ))}
              </div>
            </div>
          )}

          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="mb-1.5 font-medium text-slate-700">Cohérence valeur / poids</p>
            <ul className="space-y-1 text-slate-600">
              {Object.entries(audit.estimation_valeurs_poids.coherence_valeurs).map(([section, c]) => (
                <li key={section}>
                  <span className="font-medium">{section}</span> : saisi{" "}
                  {montantFormatter.format(c.sous_total_fourni_fcfa)} FCFA vs estimé{" "}
                  {montantFormatter.format(c.estimation_produits_fcfa)} FCFA ({c.ecart_pct.toFixed(1)}% d&apos;écart) —{" "}
                  {c.verdict}
                </li>
              ))}
              <li>
                Poids : LTA {audit.estimation_valeurs_poids.coherence_poids.poids_lta_kg} kg vs estimé{" "}
                {audit.estimation_valeurs_poids.coherence_poids.somme_estimee_kg} kg (
                {audit.estimation_valeurs_poids.coherence_poids.ecart_pct.toFixed(1)}% d&apos;écart) —{" "}
                {audit.estimation_valeurs_poids.coherence_poids.verdict}
              </li>
            </ul>
          </div>

          {audit.questions_a_l_utilisateur.length > 0 && (
            <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
              <p className="mb-1 font-medium">Questions avant génération finale</p>
              <ul className="list-inside list-disc space-y-0.5">
                {audit.questions_a_l_utilisateur.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-sm text-slate-600">{audit.recommandation_finale}</p>
        </div>
      )}
    </div>
  );
}
