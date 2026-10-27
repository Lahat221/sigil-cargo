import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { BRAND } from "@/lib/brand";

// Infos de contact affichées sur le site public — modifiables depuis
// Paramètres → Site public, avec repli sur la configuration de marque tant
// qu'aucune valeur n'est enregistrée.
export type ParametresSite = {
  whatsapp: string;
  adresse: string;
  // Adresse du point de dépôt (ville de départ, ex. Dakar).
  adresseDakar: string;
  // Horaires d'ouverture du point de dépôt (ex. « Tous les jours, de 9h à 20h30 »).
  horairesDepot: string;
  // Points de retrait en France, un par ligne : « Ville | Adresse | Horaires ».
  pointsRetrait: string;
  horaires: string;
  email: string;
  // Adresse du site imprimée sur les étiquettes colis (suivi / infos).
  siteWeb: string;
  // Villes annoncées « bientôt » sur le site public (séparées par des virgules).
  destinationsBientot: string;
  // Chiffres cumulés depuis les débuts (y compris avant l'application) :
  // le site affiche le plus élevé entre ces valeurs et le compte en direct.
  chiffresKg: string;
  chiffresClients: string;
  chiffresDeparts: string;
  // Règles de prix du calculateur du site public (nombres saisis en texte).
  seuilPetitColisKg: string;
  petitColisParKg: string;
  forfaitEnveloppe: string;
};

export type ReglesPrix = {
  seuilPetitColisKg: number;
  petitColisParKg: number;
  forfaitEnveloppe: number;
};

export const CLES_SITE = {
  whatsapp: "contact_whatsapp",
  adresse: "contact_adresse",
  adresseDakar: "adresse_dakar",
  horairesDepot: "horaires_depot",
  pointsRetrait: "points_retrait",
  horaires: "contact_horaires",
  email: "contact_email",
  siteWeb: "site_web",
  destinationsBientot: "destinations_bientot",
  chiffresKg: "chiffres_kg",
  chiffresClients: "chiffres_clients",
  chiffresDeparts: "chiffres_departs",
  seuilPetitColisKg: "prix_seuil_petit_colis_kg",
  petitColisParKg: "prix_petit_colis_par_kg",
  forfaitEnveloppe: "prix_forfait_enveloppe",
} as const;

function dernierNumero(tel: string): string {
  if (tel.includes("RENSEIGNER")) return "";
  const parties = tel.split(/[-/]/);
  return parties[parties.length - 1]?.trim() ?? "";
}

// Adresse de dépôt par défaut : celle de l'expéditeur déjà utilisée sur les
// déclarations douanières (vide tant que le tenant ne l'a pas renseignée).
function adresseDepart(): string {
  const brute = BRAND.identite.expediteurAdresse;
  if (brute.includes("RENSEIGNER")) return "";
  return brute
    .replace(/\s+/g, " ")
    .replace(/Dakar\s+Senegal/i, "Dakar, Sénégal")
    .trim();
}

export function defautsSite(): ParametresSite {
  return {
    whatsapp: dernierNumero(BRAND.identite.expediteurTel),
    adresse: BRAND.retrait?.adresse ?? "",
    adresseDakar: adresseDepart(),
    horairesDepot: "",
    pointsRetrait: "",
    horaires: BRAND.retrait?.horaires ?? "",
    email: "",
    siteWeb: "",
    destinationsBientot: "",
    chiffresKg: "",
    chiffresClients: "",
    chiffresDeparts: "",
    // Valeurs de secours (utilisées tant que Paramètres → Tarifs n'a rien
    // enregistré) : colis de moins de 8 kg à 10 €/kg, enveloppe à 15 €.
    seuilPetitColisKg: "8",
    petitColisParKg: "10",
    forfaitEnveloppe: "15",
  };
}

export async function chargerParametresSite(
  supabase: SupabaseClient<Database>
): Promise<ParametresSite> {
  const defauts = defautsSite();
  const { data } = await supabase
    .from("parametres")
    .select("cle, valeur")
    .in("cle", Object.values(CLES_SITE));

  const valeurs = new Map((data ?? []).map((p) => [p.cle, p.valeur]));
  // Une clé enregistrée (même vide) l'emporte sur le repli : permet de
  // volontairement masquer une info affichée par défaut.
  const lire = (cle: string, defaut: string) =>
    valeurs.has(cle) ? valeurs.get(cle) ?? "" : defaut;

  return {
    whatsapp: lire(CLES_SITE.whatsapp, defauts.whatsapp),
    adresse: lire(CLES_SITE.adresse, defauts.adresse),
    adresseDakar: lire(CLES_SITE.adresseDakar, defauts.adresseDakar),
    horairesDepot: lire(CLES_SITE.horairesDepot, defauts.horairesDepot),
    pointsRetrait: lire(CLES_SITE.pointsRetrait, defauts.pointsRetrait),
    horaires: lire(CLES_SITE.horaires, defauts.horaires),
    email: lire(CLES_SITE.email, defauts.email),
    siteWeb: lire(CLES_SITE.siteWeb, defauts.siteWeb),
    destinationsBientot: lire(CLES_SITE.destinationsBientot, defauts.destinationsBientot),
    chiffresKg: lire(CLES_SITE.chiffresKg, defauts.chiffresKg),
    chiffresClients: lire(CLES_SITE.chiffresClients, defauts.chiffresClients),
    chiffresDeparts: lire(CLES_SITE.chiffresDeparts, defauts.chiffresDeparts),
    seuilPetitColisKg: lire(CLES_SITE.seuilPetitColisKg, defauts.seuilPetitColisKg),
    petitColisParKg: lire(CLES_SITE.petitColisParKg, defauts.petitColisParKg),
    forfaitEnveloppe: lire(CLES_SITE.forfaitEnveloppe, defauts.forfaitEnveloppe),
  };
}

export type PointRetrait = { ville: string; adresse: string; horaires: string };

/** Points de retrait saisis (une ligne : « Ville | Adresse | Horaires »). */
export function listerPointsRetrait(texte: string): PointRetrait[] {
  return texte
    .split(/\r?\n/)
    .map((ligne) => ligne.split("|").map((x) => x.trim()))
    .filter((p) => p[0])
    .map((p) => ({ ville: p[0], adresse: p[1] ?? "", horaires: p[2] ?? "" }));
}

export function reglesPrix(site: ParametresSite): ReglesPrix {
  const defauts = defautsSite();
  const nombre = (valeur: string, repli: string) => {
    const n = parseFloat(valeur.replace(",", "."));
    return Number.isNaN(n) || n < 0 ? parseFloat(repli) : n;
  };
  return {
    seuilPetitColisKg: nombre(site.seuilPetitColisKg, defauts.seuilPetitColisKg),
    petitColisParKg: nombre(site.petitColisParKg, defauts.petitColisParKg),
    forfaitEnveloppe: nombre(site.forfaitEnveloppe, defauts.forfaitEnveloppe),
  };
}

export function listeDestinationsBientot(site: ParametresSite): string[] {
  return site.destinationsBientot
    .split(/[,\n]/)
    .map((v) => v.trim())
    .filter(Boolean);
}

// Nombre saisi dans les paramètres (0 si vide ou invalide).
export function nombreSaisi(valeur: string): number {
  const n = parseFloat(valeur.replace(",", "."));
  return Number.isNaN(n) || n < 0 ? 0 : n;
}
