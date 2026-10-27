import { BRAND } from "@/lib/brand";

/**
 * Le tarif spécial « produits alimentaires » n'existe que pour l'activité
 * Dakar → France (SIGIL). Les autres tenants (ex. M.N) n'ont ni la colonne
 * `commandes.alimentaire` ni `destinations.tarif_alimentaire_par_kg` : tout ce
 * qui lit ou écrit ces colonnes est conditionné par ce drapeau.
 */
export const TARIF_ALIMENTAIRE_ACTIF = BRAND.moduleFranceActif;
