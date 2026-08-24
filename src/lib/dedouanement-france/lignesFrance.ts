import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export type LigneProduitFrance = {
  produitId: string;
  colisId: string;
  colisNumero: number;
  poidsColisKg: number;
  typeProduit: string;
  descriptionDouane: string;
  hsCode: string | null;
  descriptionProduit: string;
  quantite: number;
  unite: string;
  exclu: boolean;
  raisonExclusion: string | null;
};

type ColisRow = {
  id: string;
  numero: number;
  poids_kg: number;
  douane_extractions: { id: string } | null;
};

/**
 * Une ligne par produit détecté pour un départ, avec l'état d'exclusion de
 * la déclaration France (case à cocher côté préparation). Contrairement à
 * chargerVueEnsemble (module Dakar), on a besoin ici de l'id du produit pour
 * pouvoir le cocher/décocher individuellement.
 */
export async function chargerLignesFrance(
  supabase: SupabaseClient<Database>,
  projetId: string
): Promise<LigneProduitFrance[]> {
  const { data } = await supabase
    .from("commandes")
    .select("id, numero, poids_kg, douane_extractions(id)")
    .eq("projet_id", projetId)
    .neq("statut", "annulee")
    .order("numero", { ascending: false })
    .returns<ColisRow[]>();

  const colisList = data ?? [];
  const extractionIds = colisList
    .map((c) => c.douane_extractions?.id)
    .filter((id): id is string => !!id);

  if (extractionIds.length === 0) return [];

  const { data: produits } = await supabase
    .from("douane_produits")
    .select(
      "id, extraction_id, type_produit, description_douane, hs_code, description_produit, quantite, unite, exclu_declaration_france, raison_exclusion_france"
    )
    .in("extraction_id", extractionIds)
    .order("ordre");

  const colisParExtraction = new Map(
    colisList
      .filter((c) => c.douane_extractions)
      .map((c) => [c.douane_extractions!.id, c])
  );

  const lignes: LigneProduitFrance[] = [];
  for (const p of produits ?? []) {
    const colisAssocie = colisParExtraction.get(p.extraction_id);
    if (!colisAssocie) continue;
    lignes.push({
      produitId: p.id,
      colisId: colisAssocie.id,
      colisNumero: colisAssocie.numero,
      poidsColisKg: colisAssocie.poids_kg,
      typeProduit: p.type_produit,
      descriptionDouane: p.description_douane,
      hsCode: p.hs_code,
      descriptionProduit: p.description_produit,
      quantite: p.quantite,
      unite: p.unite,
      exclu: p.exclu_declaration_france,
      raisonExclusion: p.raison_exclusion_france,
    });
  }
  return lignes;
}
