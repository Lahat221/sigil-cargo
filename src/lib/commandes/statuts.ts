import type { StatutCommande } from "@/types/database.types";
import { BRAND } from "@/lib/brand";

// Parcours d'un colis. Pour un tenant qui exporte vers la France (SIGIL) :
// Dakar (reçu, à vérifier, vérifié, prêt) -> vol -> Paris (transit, arrivée)
// -> ville de destination (Lyon, Marseille...) -> remis au client.
// Les autres tenants (M.N, Chine -> Dakar) gardent la chaîne d'origine.

const CHAINE_FRET: StatutCommande[] = [
  "recue",
  "a_preparer",
  "en_preparation",
  "prete",
  "expediee",
  "en_transit_paris",
  "arrive_paris",
  "arrive_destination",
  "livree",
];

const CHAINE_STANDARD: StatutCommande[] = [
  "recue",
  "a_preparer",
  "en_preparation",
  "prete",
  "expediee",
  "livree",
];

export const SUIVI_FRET_FRANCE = BRAND.moduleFranceActif;

/** Statuts de l'étape « normale », dans l'ordre (hors annulé). */
export const PIPELINE: StatutCommande[] = SUIVI_FRET_FRANCE ? CHAINE_FRET : CHAINE_STANDARD;

/** Tous les statuts proposés dans les filtres, annulé compris. */
export const STATUTS_AFFICHES: StatutCommande[] = [...PIPELINE, "annulee"];

const LIBELLES_FRET: Record<StatutCommande, string> = {
  recue: "Reçu à Dakar",
  a_preparer: "À vérifier à Dakar",
  en_preparation: "Vérifié à Dakar",
  prete: "Prêt pour le départ",
  expediee: "En vol vers Paris",
  en_transit_paris: "En transit à Paris",
  arrive_paris: "Arrivé à Paris",
  arrive_destination: "Arrivé à destination",
  livree: "Remis au client",
  annulee: "Annulé",
};

const LIBELLES_STANDARD: Record<StatutCommande, string> = {
  recue: "Reçue",
  a_preparer: "À préparer",
  en_preparation: "En préparation",
  prete: "Prête",
  expediee: "Expédiée",
  en_transit_paris: "En transit",
  arrive_paris: "Arrivée",
  arrive_destination: "Arrivée à destination",
  livree: "Livrée",
  annulee: "Annulée",
};

export const STATUT_LABELS: Record<StatutCommande, string> = SUIVI_FRET_FRANCE
  ? LIBELLES_FRET
  : LIBELLES_STANDARD;

function normaliser(texte: string): string {
  return texte.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}

/** Destination finale = Paris (ou inconnue) : le colis n'a pas d'étape après Paris. */
export function destinationEstParis(destination: string | null | undefined): boolean {
  return !destination || normaliser(destination) === "paris";
}

/** Libellé d'un statut ; « Arrivé à destination » devient « Arrivé à Lyon » selon le colis. */
export function libelleStatut(statut: StatutCommande, destination?: string | null): string {
  if (SUIVI_FRET_FRANCE && statut === "arrive_destination" && !destinationEstParis(destination)) {
    return `Arrivé à ${destination!.trim()}`;
  }
  return STATUT_LABELS[statut];
}

/** Les étapes que parcourt CE colis (un colis pour Paris n'a pas d'étape « Arrivé à Lyon »). */
export function etapesPourColis(destination: string | null | undefined): StatutCommande[] {
  if (!SUIVI_FRET_FRANCE || !destinationEstParis(destination)) return PIPELINE;
  return PIPELINE.filter((s) => s !== "arrive_destination");
}

/** Étape suivante pour CE colis (null : déjà au bout, ou annulé). */
export function statutSuivant(
  statut: StatutCommande,
  destination: string | null | undefined
): StatutCommande | null {
  const etapes = etapesPourColis(destination);
  const i = etapes.indexOf(statut);
  if (i < 0 || i >= etapes.length - 1) return null;
  return etapes[i + 1];
}

/** Rang d'un statut dans le parcours (−1 pour annulé). */
export function rangStatut(statut: StatutCommande): number {
  return PIPELINE.indexOf(statut);
}

/** À partir de « Prêt pour le départ », le colis doit avoir été vérifié à Dakar. */
export function exigeVerification(vers: StatutCommande): boolean {
  return SUIVI_FRET_FRANCE && rangStatut(vers) >= rangStatut("prete");
}

export const STYLES_STATUT: Record<StatutCommande, string> = {
  recue: "bg-slate-100 text-slate-700",
  a_preparer: "bg-amber-100 text-amber-800",
  en_preparation: "bg-blue-100 text-blue-800",
  prete: "bg-purple-100 text-purple-800",
  expediee: "bg-indigo-100 text-indigo-800",
  en_transit_paris: "bg-sky-100 text-sky-800",
  arrive_paris: "bg-teal-100 text-teal-800",
  arrive_destination: "bg-emerald-100 text-emerald-800",
  livree: "bg-green-100 text-green-800",
  annulee: "bg-red-100 text-red-800",
};
