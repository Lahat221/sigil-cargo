import { confidenceThreshold } from "./openai";
import type { ProduitExtrait } from "./schema";

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
