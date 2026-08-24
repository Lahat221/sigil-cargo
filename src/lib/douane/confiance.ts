import { confidenceThreshold } from "./openai";
import type { ProduitExtrait } from "./schema";

/** Un produit doit être vérifié par un humain si l'IA n'est pas sûre, ou si
 * elle n'a pas pu proposer de code HS (jamais présenté comme certain). */
export function produitDoitEtreVerifie(produit: ProduitExtrait): boolean {
  return produit.confiance < confidenceThreshold() || !produit.hs_code;
}

/** Statut global de l'extraction : dès qu'un produit doit être vérifié,
 * l'extraction entière passe en A_VERIFIER plutôt que TRAITE. */
export function statutExtractionPour(produits: ProduitExtrait[]): "traite" | "a_verifier" {
  if (produits.length === 0) return "a_verifier";
  return produits.some(produitDoitEtreVerifie) ? "a_verifier" : "traite";
}
