import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { ReferentielMatch } from "./referentiel";
import { cleSonore } from "./phonetique";
import { CONFIANCE_REFERENTIEL, recalculerStatutExtraction } from "./confiance";

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
 * Une correction humaine d'un produit enrichit le référentiel : la prochaine
 * fois que ce produit apparaît, le système applique la version corrigée.
 *
 * Deux sortes de corrections sont apprises :
 * - le CLASSEMENT (code HS, description douane, type), seulement avec un code
 *   HS bien formé : on n'apprend pas un code incomplet ;
 * - le RENOMMAGE (« ande » devient « brûleur d'encens traditionnel à base
 *   d'argile ») : l'ancien nom devient un synonyme de l'entrée, même sans code
 *   HS, et sera remplacé à chaque fois qu'il réapparaît.
 * On garde ce que l'IA proposait avant (ancien_hs_code) pour que vous voyiez
 * dans le référentiel ce qui a été appris.
 * Renvoie ce qui s'est passé, ou null si rien n'est à apprendre.
 */
export async function apprendreDeCorrection(
  supabase: Client,
  params: { avant: ProduitClassifie; apres: ProduitClassifie }
): Promise<"cree" | "maj" | null> {
  const { avant, apres } = params;

  const nom = apres.description_produit.trim();
  if (nom.length < NOM_MIN) return null;
  const nomNormalise = normaliserNomReferentiel(nom);

  // Ancien nom (proposé par l'IA ou écrit en wolof) devenu synonyme si l'agent l'a changé.
  const ancienNom = avant.description_produit.trim();
  const renomme = ancienNom.length >= NOM_MIN && cleSonore(ancienNom) !== cleSonore(nom);
  const nouveauSynonyme =
    ancienNom.length >= NOM_MIN && normaliserNomReferentiel(ancienNom) !== nomNormalise
      ? normaliserNomReferentiel(ancienNom)
      : null;

  const classementChange =
    (avant.hs_code ?? "") !== (apres.hs_code ?? "") ||
    avant.description_douane.trim() !== apres.description_douane.trim() ||
    avant.type_produit.trim() !== apres.type_produit.trim();
  if (!classementChange && !renomme) return null;

  const hs = apres.hs_code?.trim() ?? "";
  const hsValide = HS_REGEX.test(hs);
  // Un classement sans code HS complet ne s'apprend pas ; un simple renommage, si.
  if (!hsValide && !renomme) return null;

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

  // L'ancien nom pointe désormais vers la nouvelle entrée : une éventuelle
  // entrée au nom d'avant ne doit plus s'appliquer (sinon deux entrées se
  // disputeraient « ande » et aucune ne serait imposée).
  if (renomme && nouveauSynonyme) {
    await supabase
      .from("douane_produits_referentiel")
      .update({ actif: false, updated_at: maintenant })
      .eq("nom_normalise", nouveauSynonyme)
      .neq("nom_normalise", nomNormalise);
  }

  if (existant) {
    const synonymes = Array.from(
      new Set([...(existant.synonymes ?? []), ...(nouveauSynonyme ? [nouveauSynonyme] : [])])
    );
    const { error } = await supabase
      .from("douane_produits_referentiel")
      .update({
        ...(hsValide ? classement : {}),
        synonymes,
        actif: true,
        source: "correction",
        nb_corrections: (existant.nb_corrections ?? 0) + 1,
        derniere_correction_at: maintenant,
        ...(hsValide
          ? {
              ancien_hs_code: hsAvant && hsAvant !== hs ? hsAvant : existant.ancien_hs_code,
              ancienne_description_douane:
                avant.description_douane.trim() !== classement.description_douane
                  ? avant.description_douane.trim()
                  : existant.ancienne_description_douane,
            }
          : {}),
        updated_at: maintenant,
      })
      .eq("id", existant.id);
    return error ? null : "maj";
  }

  const { error } = await supabase.from("douane_produits_referentiel").insert({
    nom_local: nom,
    nom_normalise: nomNormalise,
    type_produit: classement.type_produit,
    description_douane: classement.description_douane,
    hs_code: hsValide ? hs : null,
    synonymes: nouveauSynonyme ? [nouveauSynonyme] : [],
    source: "correction",
    nb_corrections: 1,
    derniere_correction_at: maintenant,
    ancien_hs_code: hsValide && hsAvant && hsAvant !== hs ? hsAvant : null,
    ancienne_description_douane:
      hsValide && avant.description_douane.trim() !== classement.description_douane
        ? avant.description_douane.trim()
        : null,
  });
  return error ? null : "cree";
}

/**
 * Applique le référentiel DE FORCE aux produits qu'une IA vient d'extraire :
 * - si le nom d'un produit est un SYNONYME d'une entrée (« ande »), le produit
 *   est renommé avec le nom de l'entrée (« brûleur d'encens traditionnel à base
 *   d'argile ») — même sans code HS dans l'entrée ;
 * - si l'entrée a un code HS, type, description douane et code HS sont aussi
 *   remplacés par ceux de l'entrée.
 * C'est ce qui garantit que la même erreur ne revient pas, même si le modèle
 * ignore la consigne. Seuls les noms qui correspondent exactement (à la
 * graphie près) sont touchés. Renvoie les produits et les index corrigés.
 */
export function appliquerReferentielAuxProduits<T extends ProduitClassifie & { confiance?: number | null }>(
  produits: T[],
  matches: ReferentielMatch[]
): { produits: T[]; corriges: number[] } {
  type Candidat = { entree: ReferentielMatch; synonyme: boolean };
  const parNom = new Map<string, Candidat[]>();
  for (const m of matches) {
    const canonique = cleSonore(m.nom_local);
    for (const cle of [m.nom_local, ...(m.synonymes ?? [])]) {
      const k = cleSonore(cle);
      parNom.set(k, [...(parNom.get(k) ?? []), { entree: m, synonyme: k !== canonique }]);
    }
  }
  if (parNom.size === 0) return { produits, corriges: [] };

  const corriges: number[] = [];
  const resultat = produits.map((p, i) => {
    const candidats = parNom.get(cleSonore(p.description_produit));
    if (!candidats) return p;
    const entrees = candidats.map((c) => c.entree);

    // Renommage : le nom est seulement un synonyme, et toutes les entrées concernées
    // s'accordent sur le nom à employer.
    const nouveauNom =
      candidats.every((c) => c.synonyme) && entrees.every((e) => e.nom_local === entrees[0].nom_local)
        ? entrees[0].nom_local
        : null;

    // Classement : plusieurs entrées peuvent partager un nom (doublons), on ne l'impose
    // que si elles disent toutes la même chose, sinon on laisse l'IA.
    const avecHs = entrees.filter((e) => e.hs_code);
    const m = avecHs[0];
    const univoque =
      m !== undefined &&
      avecHs.every((c) => c.hs_code === m.hs_code && c.description_douane === m.description_douane);

    if (nouveauNom === null && !univoque) return p;

    const dejaPareil =
      (nouveauNom === null || p.description_produit === nouveauNom) &&
      (!univoque ||
        (p.hs_code === m.hs_code &&
          p.description_douane === m.description_douane &&
          p.type_produit === m.type_produit));
    if (!dejaPareil) corriges.push(i);

    return {
      ...p,
      ...(nouveauNom !== null ? { description_produit: nouveauNom } : {}),
      ...(univoque
        ? { type_produit: m.type_produit, description_douane: m.description_douane, hs_code: m.hs_code }
        : {}),
      // Nom ou classement validé par un humain : confiance haute, pas de revérification inutile.
      confiance: Math.max(p.confiance ?? 0, CONFIANCE_REFERENTIEL),
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

/**
 * Reporte AUTOMATIQUEMENT une correction sur toutes les autres lignes qui
 * portaient le même nom (à la graphie près : ande / anndé) dans des colis pas
 * encore validés — pour ne pas avoir à corriger derrière :
 * - si le nom a été changé, les autres lignes sont renommées de même ;
 * - le classement corrigé (type, description douane, code HS) est repris, sauf
 *   sur une ligne dont le code HS a déjà été fixé à la main ;
 * - chaque changement est tracé dans l'historique.
 * Renvoie le nombre de lignes modifiées.
 */
export async function propagerCorrection(
  supabase: Client,
  params: {
    produitId: string;
    nomAvant: string;
    nomApres: string;
    /** Seulement les champs de classement que l'agent vient de modifier. */
    classement: Partial<Pick<ProduitClassifie, "type_produit" | "description_douane" | "hs_code">>;
    userId: string | null;
  }
): Promise<number> {
  const nomAvant = params.nomAvant.trim();
  const nomApres = params.nomApres.trim();
  if (nomAvant.length < NOM_MIN) return 0;
  const renomme = normaliserNomReferentiel(nomAvant) !== normaliserNomReferentiel(nomApres);
  const champsClassement = Object.keys(params.classement) as (keyof typeof params.classement)[];
  if (!renomme && champsClassement.length === 0) return 0;

  const cle = cleSonore(nomAvant);
  type Ligne = {
    id: string;
    extraction_id: string;
    description_produit: string;
    type_produit: string;
    description_douane: string;
    hs_code: string | null;
    hs_code_source: string | null;
    confiance: number | null;
  };

  // Le nom n'est comparable qu'à la graphie près (clé sonore) : on lit les lignes
  // par pages (1000 maximum par requête) et on filtre ici.
  const candidates: Ligne[] = [];
  for (let debut = 0; ; debut += 1000) {
    const { data } = await supabase
      .from("douane_produits")
      .select("id, extraction_id, description_produit, type_produit, description_douane, hs_code, hs_code_source, confiance")
      .range(debut, debut + 999);
    const page = (data ?? []) as Ligne[];
    candidates.push(
      ...page.filter((l) => l.id !== params.produitId && cleSonore(l.description_produit) === cle)
    );
    if (page.length < 1000) break;
  }
  if (candidates.length === 0) return 0;

  const { data: extractions } = await supabase
    .from("douane_extractions")
    .select("id, statut")
    .in("id", Array.from(new Set(candidates.map((c) => c.extraction_id))));
  const validees = new Set((extractions ?? []).filter((e) => e.statut === "valide").map((e) => e.id));

  const historique: Database["public"]["Tables"]["douane_historique"]["Insert"][] = [];
  let nb = 0;
  const extractionsTouchees = new Set<string>();
  for (const ligne of candidates) {
    if (validees.has(ligne.extraction_id)) continue;

    const maj: Record<string, string> = {};
    if (renomme && ligne.description_produit.trim() !== nomApres) maj.description_produit = nomApres;
    // Un code HS fixé à la main sur cette ligne n'est pas écrasé.
    if (ligne.hs_code_source !== "utilisateur") {
      for (const champ of champsClassement) {
        const valeur = params.classement[champ];
        if (valeur && String(ligne[champ] ?? "") !== valeur) maj[champ] = valeur;
      }
    }
    if (Object.keys(maj).length === 0) continue;

    const { error } = await supabase
      .from("douane_produits")
      .update({
        ...maj,
        ...(maj.hs_code ? { hs_status: "propose" as const, hs_code_source: "referentiel" as const } : {}),
        // Correction validée par un humain : la confiance remonte.
        confiance: Math.max(ligne.confiance ?? 0, CONFIANCE_REFERENTIEL),
      })
      .eq("id", ligne.id);
    if (error) continue;

    nb += 1;
    extractionsTouchees.add(ligne.extraction_id);
    for (const [champ, nouvelle] of Object.entries(maj)) {
      historique.push({
        produit_id: ligne.id,
        extraction_id: ligne.extraction_id,
        champ,
        ancienne_valeur: ligne[champ as keyof Ligne] === null ? null : String(ligne[champ as keyof Ligne]),
        nouvelle_valeur: nouvelle,
        modifie_par: params.userId,
      });
    }
  }
  if (historique.length > 0) await supabase.from("douane_historique").insert(historique);
  // Les colis dont toutes les lignes sont maintenant sûres ne sont plus « à vérifier ».
  for (const id of Array.from(extractionsTouchees)) await recalculerStatutExtraction(supabase, id);
  return nb;
}
