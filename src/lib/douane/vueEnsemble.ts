import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, StatutExtractionDouane } from "@/types/database.types";

export type LigneVueEnsemble = {
  colisId: string;
  numero: number;
  clientNom: string;
  telephone: string;
  poidsKg: number;
  statutColis: StatutExtractionDouane;
  typeProduit: string | null;
  descriptionDouane: string | null;
  hsCode: string | null;
  descriptionProduit: string | null;
  quantite: number | null;
  unite: string | null;
  confiance: number | null;
};

type ColisRow = {
  id: string;
  numero: number;
  poids_kg: number;
  clients: { nom: string; telephone: string | null } | null;
  douane_extractions: { id: string; statut: StatutExtractionDouane } | null;
};

/**
 * Une ligne par produit détecté, pour tous les colis d'un départ (tous
 * statuts confondus) — sert à la fois à l'écran "Vue d'ensemble" et à
 * l'export CSV, pour que l'utilisateur voie ce qui reste à traiter/vérifier
 * en un coup d'œil et puisse reprendre le travail où il l'a laissé.
 */
export async function chargerVueEnsemble(
  supabase: SupabaseClient<Database>,
  projetId: string
): Promise<LigneVueEnsemble[]> {
  const { data } = await supabase
    .from("commandes")
    .select(
      "id, numero, poids_kg, clients(nom, telephone), douane_extractions(id, statut)"
    )
    .eq("projet_id", projetId)
    .neq("statut", "annulee")
    .order("numero", { ascending: false })
    .returns<ColisRow[]>();

  const colis = data ?? [];
  const extractionIds = colis
    .map((c) => c.douane_extractions?.id)
    .filter((id): id is string => !!id);

  const produitsParExtraction = new Map<
    string,
    {
      type_produit: string;
      description_douane: string;
      hs_code: string | null;
      description_produit: string;
      quantite: number;
      unite: string;
      confiance: number | null;
    }[]
  >();

  if (extractionIds.length > 0) {
    const { data: produits } = await supabase
      .from("douane_produits")
      .select(
        "extraction_id, type_produit, description_douane, hs_code, description_produit, quantite, unite, confiance"
      )
      .in("extraction_id", extractionIds)
      .order("ordre");

    for (const p of produits ?? []) {
      const liste = produitsParExtraction.get(p.extraction_id) ?? [];
      liste.push(p);
      produitsParExtraction.set(p.extraction_id, liste);
    }
  }

  const lignes: LigneVueEnsemble[] = [];
  for (const c of colis) {
    const base = {
      colisId: c.id,
      numero: c.numero,
      clientNom: c.clients?.nom ?? "",
      telephone: c.clients?.telephone ?? "",
      poidsKg: c.poids_kg,
      statutColis: c.douane_extractions?.statut ?? ("non_traite" as StatutExtractionDouane),
    };
    const produits = c.douane_extractions
      ? produitsParExtraction.get(c.douane_extractions.id) ?? []
      : [];

    if (produits.length === 0) {
      lignes.push({
        ...base,
        typeProduit: null,
        descriptionDouane: null,
        hsCode: null,
        descriptionProduit: null,
        quantite: null,
        unite: null,
        confiance: null,
      });
      continue;
    }

    for (const p of produits) {
      lignes.push({
        ...base,
        typeProduit: p.type_produit,
        descriptionDouane: p.description_douane,
        hsCode: p.hs_code,
        descriptionProduit: p.description_produit,
        quantite: p.quantite,
        unite: p.unite,
        confiance: p.confiance,
      });
    }
  }

  return lignes;
}
