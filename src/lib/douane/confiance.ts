import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { confidenceThreshold } from "./openai";
import type { ProduitExtrait } from "./schema";

/** Confiance d'une ligne corrigée à la main par un agent : le classement est validé par un humain. */
export const CONFIANCE_CORRIGEE = 0.99;
/** Confiance d'une ligne alignée sur le référentiel (corrections passées d'un agent). */
export const CONFIANCE_REFERENTIEL = 0.95;

/** Un produit doit être vérifié par un humain si l'IA n'est pas sûre. Le
 * code HS est toujours renseigné (jamais null — voir prompt.ts), donc seule
 * la confiance détermine si l'estimation doit être contrôlée. */
export function produitDoitEtreVerifie(produit: ProduitExtrait): boolean {
  return produit.confiance < confidenceThreshold();
}

/** Statut global de l'extraction : dès qu'un produit doit être vérifié,
 * l'extraction entière passe en A_VERIFIER plutôt que TRAITE. */
export function statutExtractionPour(produits: ProduitExtrait[]): "traite" | "a_verifier" {
  if (produits.length === 0) return "a_verifier";
  return produits.some(produitDoitEtreVerifie) ? "a_verifier" : "traite";
}

/**
 * Recalcule le statut d'un colis après une correction : il repasse en
 * « traité » dès qu'aucune de ses lignes n'est sous le seuil de confiance, et
 * revient en « à vérifier » dans le cas contraire. Un colis déjà validé par
 * l'agent (ou en cours / en erreur) n'est jamais touché.
 */
export async function recalculerStatutExtraction(
  supabase: SupabaseClient<Database>,
  extractionId: string
): Promise<void> {
  const { data: extraction } = await supabase
    .from("douane_extractions")
    .select("statut")
    .eq("id", extractionId)
    .maybeSingle();
  if (!extraction || (extraction.statut !== "traite" && extraction.statut !== "a_verifier")) return;

  const { data: lignes } = await supabase
    .from("douane_produits")
    .select("confiance")
    .eq("extraction_id", extractionId);
  if (!lignes || lignes.length === 0) return;

  const seuil = confidenceThreshold();
  const nouveau = lignes.some((l) => (l.confiance ?? 0) < seuil) ? "a_verifier" : "traite";
  if (nouveau !== extraction.statut) {
    await supabase.from("douane_extractions").update({ statut: nouveau }).eq("id", extractionId);
  }
}
