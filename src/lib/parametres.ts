import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { BRAND } from "@/lib/brand";

// Infos de contact affichées sur le site public — modifiables depuis
// Paramètres → Site public, avec repli sur la configuration de marque tant
// qu'aucune valeur n'est enregistrée.
export type ParametresSite = {
  whatsapp: string;
  adresse: string;
  horaires: string;
  email: string;
};

export const CLES_SITE = {
  whatsapp: "contact_whatsapp",
  adresse: "contact_adresse",
  horaires: "contact_horaires",
  email: "contact_email",
} as const;

function dernierNumero(tel: string): string {
  if (tel.includes("RENSEIGNER")) return "";
  const parties = tel.split(/[-/]/);
  return parties[parties.length - 1]?.trim() ?? "";
}

export function defautsSite(): ParametresSite {
  return {
    whatsapp: dernierNumero(BRAND.identite.expediteurTel),
    adresse: BRAND.retrait?.adresse ?? "",
    horaires: BRAND.retrait?.horaires ?? "",
    email: "",
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
    horaires: lire(CLES_SITE.horaires, defauts.horaires),
    email: lire(CLES_SITE.email, defauts.email),
  };
}
