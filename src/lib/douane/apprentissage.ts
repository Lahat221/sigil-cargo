import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { ReferentielMatch } from "./referentiel";
import { cleSonore } from "./phonetique";

type Client = SupabaseClient<Database>;

const HS_REGEX = /^\d{4}\.\d{2}\.\d{2}\.\d{2}$/;
const NOM_MIN = 3;

/** Même normalisation que les entrées existantes du référentiel (nom_normalise). */
export function normaliserNomReferentiel(nom: string): string {
  return nom.trim().toLowerCase();
}

export type ProduitClassifie = {
  type_produit: string;
  description_douane: string;
  hs_code: string | null;
  description_produit: string;
};

/**
 * Une correction humaine du classement d'un produit (code HS, description
 * douane ou type) enrichit le référentiel : la prochaine fois que ce produit
 * apparaît, l'IA reçoit — et le système applique — la version corrigée.
 *
 * - Seules les corrections de CLASSEMENT comptent (pas une quantité) et
 *   seulement avec un code HS bien formé : on n'apprend pas un code incomplet.
 * - Si l'agent a aussi renommé le produit, l'ancien nom (celui de l'IA)
 *   devient un synonyme de l'entrée : la même faute ne se reproduira pas.
 * - On garde ce que l'IA proposait avant (ancien_hs_code) pour que vous voyiez
 *   dans le référentiel ce qui a été appris.
 * Renvoie ce qui s'est passé, ou null si rien n'est à apprendre.
 */
export async function apprendreDeCorrection(
  supabase: Client,
  params: { avant: ProduitClassifie; apres: ProduitClassifie }
): Promise<"cree" | "maj" | null> {
  const { avant, apres } = params;

  const classementChange =
    (avant.hs_code ?? "") !== (apres.hs_code ?? "") ||
    avant.description_douane.trim() !== apres.description_douane.trim() ||
    avant.type_produit.trim() !== apres.type_produit.trim();
  if (!classementChange) return null;

  const hs = apres.hs_code?.trim() ?? "";
  if (!HS_REGEX.test(hs)) return null;

  const nom = apres.description_produit.trim();
  if (nom.length < NOM_MIN) return null;
  const nomNormalise = normaliserNomReferentiel(nom);

  // Ancien nom (proposé par l'IA) devenu synonyme si l'agent l'a changé.
  const ancienNom = avant.description_produit.trim();
  const nouveauSynonyme =
    ancienNom.length >= NOM_MIN && normaliserNomReferentiel(ancienNom) !== nomNormalise
      ? normaliserNomReferentiel(ancienNom)
      : null;

  // Des doublons peuvent exister (même nom saisi plusieurs fois) : on met à jour
  // l'entrée la plus récemment modifiée plutôt que d'en créer une de plus.
  const { data: existants } = await supabase
    .from("douane_produits_referentiel")
    .select("id, synonymes, nb_corrections, ancien_hs_code, ancienne_description_douane")
    .eq("nom_normalise", nomNormalise)
    .order("updated_at", { ascending: false })
    .limit(1);
  const existant = existants?.[0];

  const maintenant = new Date().toISOString();
  const hsAvant = avant.hs_code?.trim() || null;
  const classement = {
    type_produit: apres.type_produit.trim(),
    description_douane: apres.description_douane.trim(),
    hs_code: hs,
  };

  if (existant) {
    const synonymes = Array.from(
      new Set([...(existant.synonymes ?? []), ...(nouveauSynonyme ? [nouveauSynonyme] : [])])
    );
    const { error } = await supabase
      .from("douane_produits_referentiel")
      .update({
        ...classement,
        synonymes,
        actif: true,
        source: "correction",
        nb_corrections: (existant.nb_corrections ?? 0) + 1,
        derniere_correction_at: maintenant,
        ancien_hs_code: hsAvant && hsAvant !== hs ? hsAvant : existant.ancien_hs_code,
        ancienne_description_douane:
          avant.description_douane.trim() !== classement.description_douane
            ? avant.description_douane.trim()
            : existant.ancienne_description_douane,
        updated_at: maintenant,
      })
      .eq("id", existant.id);
    return error ? null : "maj";
  }

  const { error } = await supabase.from("douane_produits_referentiel").insert({
    nom_local: nom,
    nom_normalise: nomNormalise,
    ...classement,
    synonymes: nouveauSynonyme ? [nouveauSynonyme] : [],
    source: "correction",
    nb_corrections: 1,
    derniere_correction_at: maintenant,
    ancien_hs_code: hsAvant && hsAvant !== hs ? hsAvant : null,
    ancienne_description_douane:
      avant.description_douane.trim() !== classement.description_douane
        ? avant.description_douane.trim()
        : null,
  });
  return error ? null : "cree";
}

/**
 * Applique le référentiel DE FORCE aux produits qu'une IA vient d'extraire :
 * si le nom d'un produit est (exactement) celui d'une entrée du référentiel
 * ou l'un de ses synonymes, on remplace type, description douane et code HS
 * par ceux de l'entrée. C'est ce qui garantit que la même erreur ne revient
 * pas, même si le modèle ignore la consigne. Seules les entrées avec un code
 * HS sont appliquées ; les noms qui ne correspondent pas exactement restent
 * tels que l'IA les a classés. Renvoie les produits et les index corrigés.
 */
export function appliquerReferentielAuxProduits<T extends ProduitClassifie & { confiance?: number | null }>(
  produits: T[],
  matches: ReferentielMatch[]
): { produits: T[]; corriges: number[] } {
  // Plusieurs entrées peuvent partager un nom (doublons) : on n'impose le
  // référentiel que si elles disent toutes la même chose, sinon on laisse l'IA.
  const parNom = new Map<string, ReferentielMatch[]>();
  for (const m of matches) {
    if (!m.hs_code) continue;
    for (const cle of [m.nom_local, ...(m.synonymes ?? [])]) {
      const k = cleSonore(cle);
      parNom.set(k, [...(parNom.get(k) ?? []), m]);
    }
  }
  if (parNom.size === 0) return { produits, corriges: [] };

  const corriges: number[] = [];
  const resultat = produits.map((p, i) => {
    const candidats = parNom.get(cleSonore(p.description_produit));
    if (!candidats) return p;
    const m = candidats[0];
    const univoque = candidats.every(
      (c) => c.hs_code === m.hs_code && c.description_douane === m.description_douane
    );
    if (!univoque) return p;
    const dejaPareil =
      p.hs_code === m.hs_code &&
      p.description_douane === m.description_douane &&
      p.type_produit === m.type_produit;
    if (!dejaPareil) corriges.push(i);
    return {
      ...p,
      type_produit: m.type_produit,
      description_douane: m.description_douane,
      hs_code: m.hs_code,
      // Classement validé par un humain : confiance haute, pas de revérification inutile.
      confiance: Math.max(p.confiance ?? 0, 0.95),
    };
  });
  return { produits: resultat, corriges };
}

function echapperIlike(texte: string): string {
  return texte.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * Autres lignes produit portant EXACTEMENT le même nom mais un autre code HS,
 * dans des colis pas encore validés et jamais corrigés à la main : ce sont les
 * mêmes erreurs à corriger d'un coup.
 */
export async function trouverLignesSimilaires(
  supabase: Client,
  params: { produitId: string; nom: string; hsCode: string }
): Promise<{ id: string; extraction_id: string; hs_code: string | null }[]> {
  const { data } = await supabase
    .from("douane_produits")
    .select("id, extraction_id, hs_code, hs_code_source")
    .ilike("description_produit", echapperIlike(params.nom.trim()))
    .neq("id", params.produitId);

  const candidates = (data ?? []).filter(
    (p) => p.hs_code !== params.hsCode && p.hs_code_source !== "utilisateur"
  );
  if (candidates.length === 0) return [];

  const { data: extractions } = await supabase
    .from("douane_extractions")
    .select("id, statut")
    .in("id", Array.from(new Set(candidates.map((c) => c.extraction_id))));
  const validees = new Set((extractions ?? []).filter((e) => e.statut === "valide").map((e) => e.id));

  return candidates
    .filter((c) => !validees.has(c.extraction_id))
    .map((c) => ({ id: c.id, extraction_id: c.extraction_id, hs_code: c.hs_code }));
}
