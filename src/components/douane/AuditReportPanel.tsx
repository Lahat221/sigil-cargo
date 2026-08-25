"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  auditerDeclarationFrance,
  toggleExclusionProduit,
  type AuditHistorique,
  type LigneSnapshot,
} from "@/app/(dashboard)/gestion-douaniere/dedouanement-france/actions";

const montantFormatter = new Intl.NumberFormat("fr-FR");

function resoudreColis(
  snapshot: LigneSnapshot[],
  a: { ligne_source?: number; lignes_source?: number[] }
): LigneSnapshot[] {
  const numeros = a.ligne_source != null ? [a.ligne_source] : a.lignes_source ?? [];
  return numeros
    .map((n) => snapshot.find((s) => s.numSource === n))
    .filter((s): s is LigneSnapshot => !!s);
}

function AlerteCard({
  niveau,
  produit,
  raison,
  action,
  hs,
  colis,
  couleur,
}: {
  niveau: string;
  produit: string;
  raison: string;
  action: string;
  hs?: string;
  colis: LigneSnapshot[];
  couleur: "red" | "amber" | "yellow";
}) {
  const [isPending, startTransition] = useTransition();
  const [retire, setRetire] = useState(false);
  const styles = {
    red: "border-red-200 bg-red-50",
    amber: "border-amber-200 bg-amber-50",
    yellow: "border-yellow-200 bg-yellow-50",
  }[couleur];

  function retirer() {
    startTransition(async () => {
      await Promise.all(
        colis.map((c) => toggleExclusionProduit(c.produitId, true, `Audit : ${action}`))
      );
      setRetire(true);
    });
  }

  return (
    <div className={`rounded-md border px-3 py-2 text-sm ${styles} ${retire ? "opacity-50" : ""}`}>
      <p className="font-medium text-slate-800">
        {niveau} {produit}
        {hs && <span className="ml-1 font-mono text-xs text-slate-500">({hs})</span>}
      </p>
      {colis.length > 0 && (
        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
          Colis :
          {colis.map((c) => (
            <Link
              key={c.produitId}
              href={`/gestion-douaniere/${c.colisId}`}
              className="text-gold-2 hover:underline"
            >
              #{c.colisNumero}
            </Link>
          ))}
        </p>
      )}
      <p className="mt-1 text-slate-700">{raison}</p>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium text-slate-800">→ {action}</p>
        {colis.length > 0 && !retire && (
          <button
            type="button"
            onClick={retirer}
            disabled={isPending}
            className="shrink-0 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            {isPending ? "..." : `Retirer (${colis.length})`}
          </button>
        )}
        {retire && <span className="shrink-0 text-xs text-emerald-600">Retiré ✓</span>}
      </div>
    </div>
  );
}

export function AuditReportPanel({
  projetId,
  historiqueInitial,
}: {
  projetId: string;
  historiqueInitial: AuditHistorique[];
}) {
  const [isPending, startTransition] = useTransition();
  const [historique, setHistorique] = useState<AuditHistorique[]>(historiqueInitial);
  const [erreur, setErreur] = useState<string | null>(null);
  const [versionSelectionnee, setVersionSelectionnee] = useState<number | null>(null);

  useEffect(() => {
    setHistorique(historiqueInitial);
  }, [historiqueInitial]);

  function lancer() {
    setErreur(null);
    startTransition(async () => {
      const r = await auditerDeclarationFrance(projetId);
      if ("error" in r) {
        setErreur(r.error);
        return;
      }
      setVersionSelectionnee(null);
      // Le résultat persisté (avec son instantané colis) arrivera via
      // historiqueInitial au prochain rendu serveur ; revalidatePath dans
      // l'action déclenche déjà ce rafraîchissement.
    });
  }

  const entree = versionSelectionnee
    ? historique.find((h) => h.version === versionSelectionnee) ?? historique[0]
    : historique[0];
  const audit = entree?.audit ?? null;
  const snapshot = entree?.lignesSnapshot ?? [];

  return (
    <div className="rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-slate-700">Audit produits à risque (Aïda)</p>
          <p className="text-xs text-slate-400">
            Repère les produits interdits/réglementés/ambigus avant de générer les documents finaux.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {historique.length > 1 && (
            <select
              value={entree?.version ?? ""}
              onChange={(e) => setVersionSelectionnee(Number(e.target.value))}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-600 focus:border-navy focus:outline-none"
            >
              {historique.map((h) => (
                <option key={h.version} value={h.version}>
                  v{h.version} — {new Date(h.createdAt).toLocaleString("fr-FR")}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={lancer}
            disabled={isPending}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            {isPending ? "Audit en cours..." : audit ? "Relancer l'audit" : "Lancer l'audit"}
          </button>
        </div>
      </div>

      {erreur && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {erreur}
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
                    colis={resoudreColis(snapshot, a)}
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
                    colis={resoudreColis(snapshot, a)}
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
                    colis={resoudreColis(snapshot, a)}
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
