import { destinationEstParis } from "./statuts";
import { resumePaiements } from "@/lib/paiements";

export type ColisRepartition = {
  destination: string | null;
  poids_kg: number | null;
  nombre_paquets?: number | null;
  montant_total: number;
  client_id?: string | null;
  contenu_verifie?: boolean | null;
  paiements?: { montant_base: number }[] | null;
};

export type LigneRepartition = {
  destination: string;
  colis: number;
  paquets: number;
  poidsKg: number;
  /** Colis dont le poids n'est pas encore saisi : le total de la destination est alors sous-estimé. */
  colisSansPoids: number;
  clients: number;
  verifies: number;
  montant: number;
  reste: number;
  partPoids: number;
  partColis: number;
  poidsMoyenKg: number | null;
  prixMoyenParKg: number | null;
};

export const DESTINATION_NON_PRECISEE = "Non précisée";

type Cumul = {
  colis: number;
  paquets: number;
  poidsKg: number;
  colisSansPoids: number;
  clients: Set<string>;
  verifies: number;
  montant: number;
  reste: number;
};

function nouveauCumul(): Cumul {
  return { colis: 0, paquets: 0, poidsKg: 0, colisSansPoids: 0, clients: new Set(), verifies: 0, montant: 0, reste: 0 };
}

function ajouter(cumul: Cumul, c: ColisRepartition) {
  cumul.colis += 1;
  cumul.paquets += c.nombre_paquets ?? 1;
  if (c.poids_kg === null || c.poids_kg === undefined) cumul.colisSansPoids += 1;
  else cumul.poidsKg += c.poids_kg;
  if (c.client_id) cumul.clients.add(c.client_id);
  if (c.contenu_verifie) cumul.verifies += 1;
  cumul.montant += c.montant_total;
  cumul.reste += resumePaiements(c.montant_total, c.paiements).reste;
}

function enLigne(destination: string, c: Cumul, totalPoids: number, totalColis: number): LigneRepartition {
  return {
    destination,
    colis: c.colis,
    paquets: c.paquets,
    poidsKg: Math.round(c.poidsKg * 100) / 100,
    colisSansPoids: c.colisSansPoids,
    clients: c.clients.size,
    verifies: c.verifies,
    montant: c.montant,
    reste: c.reste,
    partPoids: totalPoids > 0 ? c.poidsKg / totalPoids : 0,
    partColis: totalColis > 0 ? c.colis / totalColis : 0,
    poidsMoyenKg: c.colis - c.colisSansPoids > 0 ? c.poidsKg / (c.colis - c.colisSansPoids) : null,
    prixMoyenParKg: c.poidsKg > 0 ? c.montant / c.poidsKg : null,
  };
}

/**
 * Répartition des colis par destination (Paris, Lyon, Marseille...) : colis,
 * paquets, kilos, part du poids, poids moyen, clients, montants. Sert à
 * choisir l'aéroport de dédouanement selon où part le plus gros volume.
 * Une destination vide est comptée avec « Non précisée », jamais avec Paris.
 */
export function repartirParDestination(colis: ColisRepartition[]): {
  lignes: LigneRepartition[];
  total: LigneRepartition;
} {
  const parDestination = new Map<string, Cumul>();
  const total = nouveauCumul();

  for (const c of colis) {
    const brut = c.destination?.trim();
    // « paris » / « Paris » → même ligne ; une destination vide reste à part.
    const cle = !brut ? DESTINATION_NON_PRECISEE : destinationEstParis(brut) ? "Paris" : brut;
    const cumul = parDestination.get(cle) ?? nouveauCumul();
    ajouter(cumul, c);
    parDestination.set(cle, cumul);
    ajouter(total, c);
  }

  const lignes = Array.from(parDestination.entries())
    .map(([destination, cumul]) => enLigne(destination, cumul, total.poidsKg, total.colis))
    .sort((a, b) => {
      if (a.destination === DESTINATION_NON_PRECISEE) return 1;
      if (b.destination === DESTINATION_NON_PRECISEE) return -1;
      return b.poidsKg - a.poidsKg || b.colis - a.colis;
    });

  return { lignes, total: enLigne("Total", total, total.poidsKg, total.colis) };
}
