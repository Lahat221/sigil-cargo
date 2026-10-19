import type { Destination } from "./destinations";
import type { ReglesPrix } from "@/lib/parametres";
import { estimerPrix } from "@/lib/prix";

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
};

type ColisPrix = {
  destination: string | null;
  poids_kg: number | null;
  prix_par_kg?: number | null;
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
  const base: VerifPrix = { prixParKg, attendu: null, ecart: false, raison: null, petitColis: false };

  if (colis.mode_fret === "conteneur" || prixParKg === null) return base;
  if (colis.poids_kg === null || colis.poids_kg <= 0) return base;
  if (!colis.destination) return base;

  const cible = normaliser(colis.destination);
  const destination = destinations.find((d) => normaliser(d.nom) === cible);
  if (!destination || destination.tarif_par_kg === null) return base;

  const estimation = estimerPrix(
    { nom: destination.nom, tarif: destination.tarif_par_kg },
    "colis",
    colis.poids_kg,
    regles
  );
  if (!estimation || estimation.tarifParKg === null) return base;

  const attendu = estimation.tarifParKg;
  return {
    prixParKg,
    attendu,
    ecart: Math.abs(prixParKg - attendu) > 0.005,
    petitColis: estimation.petitColis,
    raison: estimation.petitColis
      ? `moins de ${regles.seuilPetitColisKg} kg : tarif petit colis ${euro.format(attendu)} €/kg`
      : `tarif ${destination.nom} : ${euro.format(attendu)} €/kg`,
  };
}
