"use client";

import { useState } from "react";
import { IconEye, IconEyeOff } from "@/components/ui/Icons";
import { BRAND } from "@/lib/brand";
import type { LigneDepart, ResumeActivite, Tranche } from "@/lib/commandes/analyse";

const nombre = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
const pct = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 0 });
const monnaie = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: BRAND.devise,
  maximumFractionDigits: BRAND.devise === "XOF" ? 0 : 2,
});
const dateCourte = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const MASQUE = "••••";

function variation(v: number | null): { texte: string; classe: string } | null {
  if (v === null || !Number.isFinite(v)) return null;
  const arrondi = Math.round(v * 100);
  if (arrondi === 0) return { texte: "= stable", classe: "text-slate-500" };
  return arrondi > 0
    ? { texte: `▲ +${arrondi} %`, classe: "text-emerald-600" }
    : { texte: `▼ ${arrondi} %`, classe: "text-red-600" };
}

function Carte({ libelle, valeur, detail }: { libelle: string; valeur: string; detail?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{libelle}</p>
      <p className="mt-0.5 text-xl font-bold tabular-nums text-slate-900">{valeur}</p>
      {detail && <p className="mt-0.5 text-xs text-slate-500">{detail}</p>}
    </div>
  );
}

/**
 * Lecture de l'activité pour décider : part des petits colis, répartition par
 * tranche de poids, évolution du prix moyen au kilo départ après départ. Les
 * montants (et tout ce qui en dérive) sont masqués par défaut, comme ailleurs
 * dans le tableau de bord. Pensé pour le téléphone : cartes et barres, pas de
 * tableau à faire défiler.
 */
export function AnalyseActivite({
  resume,
  tranches,
  departs,
  seuilKg,
}: {
  resume: ResumeActivite;
  tranches: Tranche[];
  /** Du plus ancien au plus récent. */
  departs: LigneDepart[];
  seuilKg: number;
}) {
  const [montantsVisibles, setMontantsVisibles] = useState(false);
  const m = (v: number | null) => (v === null ? "—" : montantsVisibles ? monnaie.format(v) : MASQUE);

  if (resume.colis === 0) {
    return (
      <div className="rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-medium text-slate-700">Analyse de l&apos;activité</h2>
        <p className="mt-2 text-sm text-slate-400">Aucun colis sur cette sélection.</p>
      </div>
    );
  }

  const seuil = nombre.format(seuilKg);
  const recents = [...departs].reverse().slice(0, 6);
  const dernier = departs[departs.length - 1];
  const precedent = departs[departs.length - 2];
  const maxKg = Math.max(...recents.map((d) => d.kg), 1);

  // Phrases de lecture : celles qui citent des montants ne s'affichent qu'une fois révélés.
  const lectures: string[] = [];
  if (resume.petits.colis > 0 && resume.kg > 0) {
    lectures.push(
      `Les petits colis (moins de ${seuil} kg) représentent ${pct.format(resume.petits.partColis)} des colis mais ${pct.format(resume.petits.partKg)} du poids.`
    );
  }
  if (montantsVisibles && resume.petits.prixMoyenKg && resume.autres.prixMoyenKg) {
    lectures.push(
      `Ils apportent ${pct.format(resume.petits.partMontant)} du chiffre d'affaires : ${monnaie.format(resume.petits.prixMoyenKg)}/kg en moyenne, contre ${monnaie.format(resume.autres.prixMoyenKg)}/kg pour les autres colis.`
    );
  }
  const trancheLegere = tranches.find((t) => t.colis > 0 && t.prixMoyenKg !== null);
  const trancheLourde = [...tranches].reverse().find((t) => t.colis > 0 && t.prixMoyenKg !== null);
  if (
    montantsVisibles &&
    trancheLegere &&
    trancheLourde &&
    trancheLegere.id !== trancheLourde.id &&
    trancheLegere.prixMoyenKg &&
    trancheLourde.prixMoyenKg
  ) {
    lectures.push(
      `Plus le colis est lourd, plus le prix moyen au kilo baisse : ${monnaie.format(trancheLegere.prixMoyenKg)}/kg pour les ${trancheLegere.libelle.split(" (")[0].toLowerCase()}, ${monnaie.format(trancheLourde.prixMoyenKg)}/kg pour les ${trancheLourde.libelle.split(" (")[0].toLowerCase()}.`
    );
  }
  if (dernier && precedent) {
    const dKg = variation(dernier.variationKg);
    lectures.push(
      dernier.enCours
        ? `Départ en cours (${dernier.nom}) : ${nombre.format(dernier.kg)} kg et ${dernier.colis} colis à ce jour, petits colis à ${pct.format(dernier.partPetitsKg)} du poids (contre ${pct.format(precedent.partPetitsKg)} au départ précédent).`
        : `Dernier départ (${dernier.nom}) : ${nombre.format(dernier.kg)} kg${dKg ? ` (${dKg.texte.replace("▲ ", "").replace("▼ ", "")} vs le précédent)` : ""}, petits colis à ${pct.format(dernier.partPetitsKg)} du poids (contre ${pct.format(precedent.partPetitsKg)}).`
    );
    const dPrix = variation(dernier.variationPrix);
    if (montantsVisibles && dPrix && dernier.prixMoyenKg) {
      lectures.push(
        `Prix moyen au kilo : ${monnaie.format(dernier.prixMoyenKg)} (${dPrix.texte.replace("▲ ", "").replace("▼ ", "")}). Cette moyenne varie avec la part des petits colis (plus chers au kilo) et des très gros colis (moins chers au kilo), donc un seul gros colis peut la faire bouger.`
      );
    }
  }

  return (
    <div className="rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium text-slate-700">Analyse de l&apos;activité</h2>
          <p className="text-xs text-slate-500">Pour comprendre le fret et ajuster les prix.</p>
        </div>
        <button
          type="button"
          onClick={() => setMontantsVisibles((v) => !v)}
          className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-600 transition-colors hover:bg-slate-100 sm:px-2.5 sm:py-1"
        >
          {montantsVisibles ? <IconEyeOff size={13} /> : <IconEye size={13} />}
          {montantsVisibles ? "Masquer les montants" : "Afficher les montants"}
        </button>
      </div>

      {lectures.length > 0 && (
        <ul className="mb-4 space-y-1.5 rounded-md bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
          {lectures.map((l, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden className="text-gold-2">
                ●
              </span>
              <span>{l}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Chiffres clés */}
      <div className="mb-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Carte
          libelle="Petits colis"
          valeur={pct.format(resume.petits.partColis)}
          detail={`${resume.petits.colis} colis · moins de ${seuil} kg`}
        />
        <Carte
          libelle="Part du poids"
          valeur={pct.format(resume.petits.partKg)}
          detail={`${nombre.format(resume.petits.kg)} kg sur ${nombre.format(resume.kg)}`}
        />
        <Carte
          libelle="Poids moyen / colis"
          valeur={resume.poidsMoyenKg !== null ? `${nombre.format(resume.poidsMoyenKg)} kg` : "—"}
          detail={`${resume.clients} clients`}
        />
        <Carte
          libelle="Prix moyen / kg"
          valeur={m(resume.prixMoyenKg)}
          detail={montantsVisibles ? `Panier moyen ${m(resume.panierMoyen)}` : "Montants masqués"}
        />
      </div>

      {/* Tranches de poids */}
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Par tranche de poids</h3>
      <div className="mb-5 space-y-2.5">
        {tranches.map((t) => (
          <div key={t.id} className="rounded-lg border border-slate-200 p-3">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">{t.libelle}</p>
              <p className="shrink-0 text-sm tabular-nums text-slate-600">
                {t.colis} colis · <span className="font-semibold text-slate-900">{nombre.format(t.kg)} kg</span>
              </p>
            </div>
            <Barre libelle="des colis" valeur={t.partColis} couleur="bg-slate-400" />
            <Barre libelle="du poids" valeur={t.partKg} couleur="bg-navy" />
            <p className="mt-1.5 text-xs text-slate-500">
              Prix moyen {m(t.prixMoyenKg)}
              {montantsVisibles && t.prixMoyenKg !== null ? "/kg" : ""} · Chiffre d&apos;affaires {m(t.montant)}
            </p>
          </div>
        ))}
        {resume.colisSansPoids > 0 && (
          <p className="text-xs text-amber-700">
            {resume.colisSansPoids} colis sans poids saisi {resume.colisSansPoids > 1 ? "ne sont pas classés" : "n'est pas classé"} dans ces tranches.
          </p>
        )}
      </div>

      {/* Évolution par départ */}
      {recents.length > 0 && (
        <>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Évolution départ après départ
          </h3>
          <div className="space-y-2.5">
            {recents.map((d, i) => {
              const vKg = variation(d.variationKg);
              const vPrix = variation(d.variationPrix);
              return (
                <div key={d.projetId} className={`rounded-lg border p-3 ${i === 0 ? "border-gold-2/50 bg-gold-1/10" : "border-slate-200"}`}>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-semibold text-slate-900" title={d.nom}>
                      {d.nom}
                      {d.enCours && (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 align-middle text-[10px] font-semibold text-amber-800">
                          en cours
                        </span>
                      )}
                    </p>
                    <p className="shrink-0 text-xs text-slate-500">{dateCourte.format(new Date(d.date))}</p>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-navy" style={{ width: `${Math.round((d.kg / maxKg) * 100)}%` }} />
                    </div>
                    <p className="w-20 text-right text-sm font-semibold tabular-nums text-slate-900">{nombre.format(d.kg)} kg</p>
                  </div>
                  <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs sm:grid-cols-4">
                    <Ligne libelle="Colis" valeur={String(d.colis)} />
                    <Ligne
                      libelle="Clients"
                      valeur={`${d.clients}${d.nouveauxClients > 0 ? ` (${d.nouveauxClients} nouv.)` : ""}`}
                    />
                    <Ligne libelle="Petits colis" valeur={`${pct.format(d.partPetitsKg)} du poids`} />
                    <Ligne
                      libelle="Prix moyen/kg"
                      valeur={m(d.prixMoyenKg)}
                      extra={montantsVisibles && vPrix ? <span className={vPrix.classe}>{vPrix.texte}</span> : null}
                    />
                  </dl>
                  {d.enCours && <p className="mt-1.5 text-xs text-slate-500">Départ encore ouvert : les totaux vont augmenter.</p>}
                  {vKg && <p className={`mt-1.5 text-xs ${vKg.classe}`}>Poids vs départ précédent : {vKg.texte}</p>}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function Barre({ libelle, valeur, couleur }: { libelle: string; valeur: number; couleur: string }) {
  return (
    <div className="mt-1.5 flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${couleur}`} style={{ width: `${Math.round(valeur * 100)}%` }} />
      </div>
      <span className="w-28 shrink-0 text-xs tabular-nums text-slate-600">
        <span className="font-semibold">{pct.format(valeur)}</span> {libelle}
      </span>
    </div>
  );
}

function Ligne({ libelle, valeur, extra }: { libelle: string; valeur: string; extra?: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-slate-500">{libelle}</dt>
      <dd className="font-semibold tabular-nums text-slate-800">
        {valeur} {extra}
      </dd>
    </div>
  );
}
