import type { ReglesPrix } from "@/lib/parametres";

export type DestinationTarif = { nom: string; tarif: number | null };

export type EstimationPrix = {
  total: number | null;
  tarifParKg: number | null;
  petitColis: boolean;
  enveloppe: boolean;
};

// Même règle que sur l'affiche et le calculateur du site : une enveloppe est
// au forfait ; un colis sous le seuil est au tarif "petit colis" ; au-dessus
// c'est le tarif de la destination. Retourne null si la destination est
// inconnue ou le poids invalide.
export function estimerPrix(
  destination: DestinationTarif | undefined,
  type: "colis" | "enveloppe",
  poidsKg: number | null,
  regles: ReglesPrix
): EstimationPrix | null {
  if (!destination) return null;
  if (type === "enveloppe") {
    return {
      total: regles.forfaitEnveloppe,
      tarifParKg: null,
      petitColis: false,
      enveloppe: true,
    };
  }
  if (poidsKg === null || Number.isNaN(poidsKg) || poidsKg <= 0) return null;
  const petitColis = poidsKg < regles.seuilPetitColisKg;
  const tarifParKg = petitColis ? regles.petitColisParKg : destination.tarif;
  return {
    total: tarifParKg === null ? null : poidsKg * tarifParKg,
    tarifParKg,
    petitColis,
    enveloppe: false,
  };
}
