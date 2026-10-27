"use client";

import type { Destination } from "@/lib/commandes/destinations";
import type { ReglesPrix } from "@/lib/parametres";
import { tarifProposeParKg, type DestinationTarif } from "@/lib/prix";

const euro = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

export function versDestinationTarif(
  destinations: Destination[],
  nom: string
): DestinationTarif | undefined {
  const d = destinations.find((x) => x.nom === nom);
  return d
    ? { nom: d.nom, tarif: d.tarif_par_kg, tarifAlimentaire: d.tarif_alimentaire_par_kg }
    : undefined;
}

/** Au moins une destination a un tarif spécial alimentaire : la case a un sens. */
export function tarifAlimentaireDisponible(destinations: Destination[]): boolean {
  return destinations.some((d) => d.tarif_alimentaire_par_kg !== null);
}

/** Case « produits alimentaires » (tarif spécial par destination). */
export function CaseAlimentaire({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300"
      />
      Produits alimentaires (tarif spécial)
    </label>
  );
}

/**
 * Explique le tarif au kilo qui s'applique (petit colis, alimentaire ou autres
 * produits) et avertit si le prix saisi s'en écarte.
 */
export function IndicationTarif({
  destinations,
  regles,
  destination,
  poidsKg,
  alimentaire,
  prixSaisi,
}: {
  destinations: Destination[];
  regles: ReglesPrix;
  destination: string;
  poidsKg: string;
  alimentaire: boolean;
  prixSaisi: string;
}) {
  if (!destination) return null;
  const poids = parseFloat(poidsKg);
  const proposition = tarifProposeParKg(
    versDestinationTarif(destinations, destination),
    Number.isNaN(poids) ? null : poids,
    regles,
    alimentaire
  );
  if (!proposition) return null;

  const prix = parseFloat(prixSaisi);
  const ecart = !Number.isNaN(prix) && Math.abs(prix - proposition.tarif) > 0.005;

  return ecart ? (
    <p className="mt-1 text-xs font-medium text-amber-700">
      ⚠ Tarif attendu : {euro.format(proposition.tarif)} €/kg ({proposition.raison}) — vous avez saisi{" "}
      {euro.format(prix)} €/kg.
    </p>
  ) : (
    <p className="mt-1 text-xs text-slate-500">
      Tarif appliqué : {euro.format(proposition.tarif)} €/kg ({proposition.raison}).
    </p>
  );
}
