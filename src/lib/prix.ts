import type { ReglesPrix } from "@/lib/parametres";

export type DestinationTarif = {
  nom: string;
  /** Tarif « autres produits » (€/kg). */
  tarif: number | null;
  /** Tarif spécial produits alimentaires (€/kg), s'il existe pour cette destination. */
  tarifAlimentaire?: number | null;
};

export type EstimationPrix = {
  total: number | null;
  /** Tarif au kilo de la part « autres produits ». */
  tarifParKg: number | null;
  /** Tarif au kilo de la part alimentaire (null : pas de part alimentaire). */
  tarifAlimentaireParKg: number | null;
  /** Part alimentaire du colis, en kg (0 : aucune). */
  poidsAlimentaireKg: number;
  petitColis: boolean;
  enveloppe: boolean;
};

export type TarifPropose = { tarif: number; raison: string };

/** Poids de la part alimentaire, borné entre 0 et le poids total du colis. */
export function partAlimentaireKg(poidsKg: number | null, poidsAlimentaireKg: number | null | undefined): number {
  if (poidsKg === null || Number.isNaN(poidsKg) || poidsKg <= 0) return 0;
  if (poidsAlimentaireKg == null || Number.isNaN(poidsAlimentaireKg) || poidsAlimentaireKg <= 0) return 0;
  return Math.min(poidsAlimentaireKg, poidsKg);
}

/**
 * Tarifs au kilo proposés pour un colis, pour sa part « autres produits » et
 * pour sa part alimentaire. Même règle que l'affiche et le calculateur du
 * site : sous le seuil de poids le colis est entier au tarif « petit colis »
 * (la règle porte sur le poids TOTAL, quels que soient les produits) ; au-dessus
 * chaque part prend le tarif de la destination (alimentaire : tarif spécial,
 * à défaut celui des autres produits).
 * Utilisable avant que le poids soit connu : on propose alors le tarif normal.
 */
export function tarifsProposes(
  destination: DestinationTarif | undefined,
  poidsKg: number | null,
  regles: ReglesPrix
): { autres: TarifPropose | null; alimentaire: TarifPropose | null } {
  if (!destination) return { autres: null, alimentaire: null };
  if (poidsKg !== null && !Number.isNaN(poidsKg) && poidsKg > 0 && poidsKg < regles.seuilPetitColisKg) {
    const petit = {
      tarif: regles.petitColisParKg,
      raison: `petit colis (moins de ${regles.seuilPetitColisKg} kg)`,
    };
    return { autres: petit, alimentaire: petit };
  }
  const autres =
    destination.tarif === null ? null : { tarif: destination.tarif, raison: `tarif ${destination.nom}` };
  const alimentaire =
    destination.tarifAlimentaire != null
      ? { tarif: destination.tarifAlimentaire, raison: `produits alimentaires — ${destination.nom}` }
      : autres;
  return { autres, alimentaire };
}

/** Montant d'un colis à deux tarifs (même formule que la colonne `montant_total`, hors enveloppe). */
export function montantColis(
  poidsKg: number,
  poidsAlimentaireKg: number,
  prixParKg: number,
  prixAlimentaireParKg: number
): number {
  return (poidsKg - poidsAlimentaireKg) * prixParKg + poidsAlimentaireKg * prixAlimentaireParKg;
}

// Retourne null si la destination est inconnue ou le poids invalide.
export function estimerPrix(
  destination: DestinationTarif | undefined,
  type: "colis" | "enveloppe",
  poidsKg: number | null,
  regles: ReglesPrix,
  poidsAlimentaireKg: number | null = 0
): EstimationPrix | null {
  if (!destination) return null;
  if (type === "enveloppe") {
    return {
      total: regles.forfaitEnveloppe,
      tarifParKg: null,
      tarifAlimentaireParKg: null,
      poidsAlimentaireKg: 0,
      petitColis: false,
      enveloppe: true,
    };
  }
  if (poidsKg === null || Number.isNaN(poidsKg) || poidsKg <= 0) return null;
  const petitColis = poidsKg < regles.seuilPetitColisKg;
  const part = partAlimentaireKg(poidsKg, poidsAlimentaireKg);
  const { autres, alimentaire } = tarifsProposes(destination, poidsKg, regles);
  const tarifAutres = autres?.tarif ?? null;
  const tarifAlim = part > 0 ? alimentaire?.tarif ?? null : null;
  // Il faut un tarif pour chaque part qui pèse quelque chose.
  const manque = (part < poidsKg && tarifAutres === null) || (part > 0 && tarifAlim === null);
  const total = manque ? null : montantColis(poidsKg, part, tarifAutres ?? 0, tarifAlim ?? 0);
  return {
    total,
    tarifParKg: tarifAutres,
    tarifAlimentaireParKg: tarifAlim,
    poidsAlimentaireKg: part,
    petitColis,
    enveloppe: false,
  };
}
