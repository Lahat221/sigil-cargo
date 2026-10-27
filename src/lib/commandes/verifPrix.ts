import type { Destination } from "./destinations";
import type { ReglesPrix } from "@/lib/parametres";
import { estimerPrix, partAlimentaireKg } from "@/lib/prix";

export type VerifPrix = {
  /** Prix au kilo réellement appliqué au colis. */
  prixParKg: number | null;
  /** Prix au kilo attendu d'après la destination et le poids (null : non vérifiable). */
  attendu: number | null;
  /** true : le prix appliqué diffère du prix attendu. */
  ecart: boolean;
  /** Pourquoi cette valeur est attendue (« moins de 8 kg : tarif petit colis »…). */
  raison: string | null;
  petitColis: boolean;
  /** Part alimentaire du colis (kg) : 0 si le colis n'en a pas. */
  poidsAlimentaireKg: number;
  /** Prix au kilo appliqué à la part alimentaire. */
  prixAlimentaireParKg: number | null;
  /** Prix au kilo attendu pour la part alimentaire (null : pas de part alimentaire). */
  attenduAlimentaire: number | null;
};

type ColisPrix = {
  destination: string | null;
  poids_kg: number | null;
  prix_par_kg?: number | null;
  poids_alimentaire_kg?: number | null;
  prix_alimentaire_par_kg?: number | null;
  mode_fret?: "aerien" | "conteneur" | null;
};

function normaliser(texte: string): string {
  return texte.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}

const euro = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

/**
 * Compare le prix au kilo appliqué à un colis au prix attendu — celui de sa
 * destination, ou le tarif « petit colis » sous le seuil de poids (mêmes
 * règles que le calculateur du site). Sert à repérer une erreur de prix d'un
 * coup d'œil dans la liste ; un prix négocié apparaît aussi comme écart, à
 * charge de l'utilisateur de le reconnaître.
 */
export function verifierPrixColis(
  colis: ColisPrix,
  destinations: Destination[],
  regles: ReglesPrix
): VerifPrix {
  const prixParKg = colis.prix_par_kg ?? null;
  const part = partAlimentaireKg(colis.poids_kg, colis.poids_alimentaire_kg);
  const prixAlimentaire = part > 0 ? colis.prix_alimentaire_par_kg ?? prixParKg : null;
  const base: VerifPrix = {
    prixParKg,
    attendu: null,
    ecart: false,
    raison: null,
    petitColis: false,
    poidsAlimentaireKg: part,
    prixAlimentaireParKg: prixAlimentaire,
    attenduAlimentaire: null,
  };

  if (colis.mode_fret === "conteneur" || prixParKg === null) return base;
  if (colis.poids_kg === null || colis.poids_kg <= 0) return base;
  if (!colis.destination) return base;

  const cible = normaliser(colis.destination);
  const destination = destinations.find((d) => normaliser(d.nom) === cible);
  if (!destination || destination.tarif_par_kg === null) return base;

  const estimation = estimerPrix(
    {
      nom: destination.nom,
      tarif: destination.tarif_par_kg,
      tarifAlimentaire: destination.tarif_alimentaire_par_kg,
    },
    "colis",
    colis.poids_kg,
    regles,
    part
  );
  if (!estimation || estimation.tarifParKg === null) return base;

  const attendu = estimation.tarifParKg;
  const attenduAlimentaire = estimation.tarifAlimentaireParKg;
  const ecartAlimentaire =
    attenduAlimentaire !== null &&
    prixAlimentaire !== null &&
    Math.abs(prixAlimentaire - attenduAlimentaire) > 0.005;
  return {
    ...base,
    attendu,
    attenduAlimentaire,
    // Si tout le colis est alimentaire, le prix des « autres produits » ne compte pas.
    ecart:
      (colis.poids_kg > part && Math.abs(prixParKg - attendu) > 0.005) || ecartAlimentaire,
    petitColis: estimation.petitColis,
    raison: estimation.petitColis
      ? `moins de ${regles.seuilPetitColisKg} kg : tarif petit colis ${euro.format(attendu)} €/kg`
      : part > 0 && attenduAlimentaire !== null
        ? `autres produits ${euro.format(attendu)} €/kg, alimentaire ${euro.format(attenduAlimentaire)} €/kg (${destination.nom})`
        : `tarif ${destination.nom} : ${euro.format(attendu)} €/kg`,
  };
}
