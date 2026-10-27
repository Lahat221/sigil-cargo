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
  tarifParKg: number | null;
  petitColis: boolean;
  enveloppe: boolean;
  /** Le tarif alimentaire de la destination a été appliqué. */
  alimentaire: boolean;
};

// Même règle que sur l'affiche et le calculateur du site : une enveloppe est
// au forfait ; un colis sous le seuil est au tarif « petit colis » (quel que
// soit le produit) ; au-dessus c'est le tarif de la destination — le tarif
// spécial pour les produits alimentaires, sinon celui des autres produits.
// Retourne null si la destination est inconnue ou le poids invalide.
export function estimerPrix(
  destination: DestinationTarif | undefined,
  type: "colis" | "enveloppe",
  poidsKg: number | null,
  regles: ReglesPrix,
  alimentaire = false
): EstimationPrix | null {
  if (!destination) return null;
  if (type === "enveloppe") {
    return {
      total: regles.forfaitEnveloppe,
      tarifParKg: null,
      petitColis: false,
      enveloppe: true,
      alimentaire: false,
    };
  }
  if (poidsKg === null || Number.isNaN(poidsKg) || poidsKg <= 0) return null;
  const petitColis = poidsKg < regles.seuilPetitColisKg;
  const tarifAlim =
    alimentaire && destination.tarifAlimentaire != null ? destination.tarifAlimentaire : null;
  const tarifParKg = petitColis ? regles.petitColisParKg : tarifAlim ?? destination.tarif;
  return {
    total: tarifParKg === null ? null : poidsKg * tarifParKg,
    tarifParKg,
    petitColis,
    enveloppe: false,
    alimentaire: !petitColis && tarifAlim !== null,
  };
}

/**
 * Tarif au kilo proposé pour un colis (même règle qu'estimerPrix), utilisable
 * AVANT que le poids soit connu : sans poids, on propose le tarif normal de la
 * destination (alimentaire ou autres) ; il passe au tarif petit colis dès
 * qu'un poids inférieur au seuil est saisi.
 */
export function tarifProposeParKg(
  destination: DestinationTarif | undefined,
  poidsKg: number | null,
  regles: ReglesPrix,
  alimentaire: boolean
): { tarif: number; raison: string } | null {
  if (!destination) return null;
  if (poidsKg !== null && !Number.isNaN(poidsKg) && poidsKg > 0 && poidsKg < regles.seuilPetitColisKg) {
    return {
      tarif: regles.petitColisParKg,
      raison: `petit colis (moins de ${regles.seuilPetitColisKg} kg)`,
    };
  }
  if (alimentaire && destination.tarifAlimentaire != null) {
    return { tarif: destination.tarifAlimentaire, raison: `produits alimentaires — ${destination.nom}` };
  }
  if (destination.tarif === null) return null;
  return { tarif: destination.tarif, raison: `tarif ${destination.nom}` };
}
