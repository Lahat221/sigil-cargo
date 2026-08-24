import { z } from "zod";

// Schéma de sortie strict pour l'appel OpenAI (Structured Output). L'IA ne
// renvoie jamais l'identité client ni le poids : ces valeurs sont déjà
// connues et fiables côté base de données, jamais à inventer (règle
// "poids total jamais recalculé par produit" du cahier des charges).
export const ProduitExtraitSchema = z.object({
  type_produit: z.string(),
  description_douane: z.string(),
  hs_code: z.string().nullable(),
  description_produit: z.string(),
  quantite: z.number(),
  unite: z.string(),
  confiance: z.number().min(0).max(1),
});

export const ExtractionDouaneSchema = z.object({
  produits: z.array(ProduitExtraitSchema),
  produits_retires: z.array(z.object({ description: z.string() })),
  anomalies: z.array(z.string()),
});

export type ProduitExtrait = z.infer<typeof ProduitExtraitSchema>;
export type ExtractionDouaneIA = z.infer<typeof ExtractionDouaneSchema>;
