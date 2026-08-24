import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export type ReferentielMatch = {
  nom_local: string;
  type_produit: string;
  description_douane: string;
  hs_code: string | null;
};

function normalise(texte: string): string {
  return texte
    .toLowerCase()
    .normalize("NFD")
    .split("")
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return code < 0x0300 || code > 0x036f;
    })
    .join("");
}

/**
 * Recherche naïve mais efficace : le référentiel est petit (quelques dizaines
 * d'entrées), donc on le charge en entier et on retient les entrées dont le
 * nom normalisé ou un synonyme apparaît comme mot dans la description brute.
 * Priorité au référentiel avant l'IA (règle métier section 18 du cahier des
 * charges) — ces correspondances sont injectées dans le prompt en contexte.
 */
export async function rechercherReferentiel(
  supabase: SupabaseClient<Database>,
  rawDescription: string
): Promise<ReferentielMatch[]> {
  const { data } = await supabase
    .from("douane_produits_referentiel")
    .select("nom_local, nom_normalise, type_produit, description_douane, hs_code, synonymes")
    .eq("actif", true);

  if (!data || data.length === 0) return [];

  const texteNormalise = normalise(rawDescription);
  const mots = new Set(texteNormalise.split(/[^a-z0-9]+/).filter(Boolean));

  const matches: ReferentielMatch[] = [];
  for (const entree of data) {
    const candidats = [entree.nom_normalise, ...entree.synonymes].map(normalise);
    const trouve = candidats.some(
      (c) => mots.has(c) || (c.length > 3 && texteNormalise.includes(c))
    );
    if (trouve) {
      matches.push({
        nom_local: entree.nom_local,
        type_produit: entree.type_produit,
        description_douane: entree.description_douane,
        hs_code: entree.hs_code,
      });
    }
  }
  return matches;
}
