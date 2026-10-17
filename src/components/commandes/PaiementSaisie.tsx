"use client";

import {
  DEVISES,
  MODES_PAIEMENT,
  convertir,
  deviseBase,
  formaterAvecEquivalent,
  versDeviseBase,
  type DevisePaiement,
  type PaiementInput,
} from "@/lib/paiements";

export type SaisiePaiement = { montant: string; devise: DevisePaiement; mode: string };

export const SAISIE_VIDE: SaisiePaiement = {
  montant: "",
  devise: deviseBase(),
  mode: "especes",
};

const CHAMP =
  "rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-navy focus:ring-1 focus:ring-navy/20 focus:outline-none";
const BOUTON =
  "rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100";

function nombre(texte: string): number {
  return parseFloat(texte.replace(/\s/g, "").replace(",", "."));
}

/** null si le champ montant est vide ; sinon le versement à enregistrer. */
export function saisieVersInput(s: SaisiePaiement): PaiementInput | null {
  if (!s.montant.trim()) return null;
  return { montant: nombre(s.montant), devise: s.devise, mode: s.mode };
}

/** Montant saisi converti dans la devise de l'entreprise (NaN si illisible). */
export function saisieEnBase(s: SaisiePaiement): number {
  const m = nombre(s.montant);
  return Number.isFinite(m) ? versDeviseBase(m, s.devise) : NaN;
}

/**
 * Champs de saisie d'un versement (montant + devise EUR/FCFA + mode), avec
 * raccourcis « Tout payer » / « 50 % » calculés sur `cible` (devise de
 * l'entreprise) et rappel du reste à payer après ce versement.
 */
export function PaiementSaisie({
  valeur,
  onChange,
  cible,
  libelleCible = "Montant du colis",
}: {
  valeur: SaisiePaiement;
  onChange: (v: SaisiePaiement) => void;
  /** Montant à régler (devise de l'entreprise), null si encore inconnu. */
  cible: number | null;
  libelleCible?: string;
}) {
  const maj = (patch: Partial<SaisiePaiement>) => onChange({ ...valeur, ...patch });
  const base = deviseBase();

  function remplir(fraction: number) {
    if (cible === null) return;
    const dansDevise = convertir(cible * fraction, base, valeur.devise);
    maj({ montant: String(dansDevise) });
  }

  const verse = saisieEnBase(valeur);
  const resteApres =
    cible !== null && Number.isFinite(verse) ? Math.max(cible - verse, 0) : null;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto]">
        <input
          inputMode="decimal"
          value={valeur.montant}
          onChange={(e) => maj({ montant: e.target.value })}
          placeholder="Montant versé"
          className={`${CHAMP} w-full`}
        />
        <select
          value={valeur.devise}
          onChange={(e) => maj({ devise: e.target.value as DevisePaiement })}
          className={CHAMP}
          aria-label="Devise"
        >
          {DEVISES.map((d) => (
            <option key={d.code} value={d.code}>
              {d.label}
            </option>
          ))}
        </select>
        <select
          value={valeur.mode}
          onChange={(e) => maj({ mode: e.target.value })}
          className={CHAMP}
          aria-label="Mode de paiement"
        >
          {MODES_PAIEMENT.map((m) => (
            <option key={m.code} value={m.code}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => remplir(1)} disabled={cible === null} className={BOUTON}>
          Tout payer
        </button>
        <button type="button" onClick={() => remplir(0.5)} disabled={cible === null} className={BOUTON}>
          50 %
        </button>
        {valeur.montant && (
          <button type="button" onClick={() => maj({ montant: "" })} className={BOUTON}>
            Effacer
          </button>
        )}
        <span className="text-xs text-slate-500">
          {cible === null
            ? `${libelleCible} : encore inconnu (poids non saisi)`
            : `${libelleCible} : ${formaterAvecEquivalent(cible)}`}
        </span>
      </div>

      {resteApres !== null && valeur.montant.trim() && (
        <p className="rounded-md bg-slate-50 px-3 py-2 text-sm">
          <span className="text-slate-500">Reste à payer au retrait : </span>
          <span className="font-semibold text-slate-900">
            {resteApres > 0 ? formaterAvecEquivalent(resteApres) : "rien — colis payé en totalité"}
          </span>
        </p>
      )}
    </div>
  );
}
