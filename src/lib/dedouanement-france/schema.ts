import { z } from "zod";

const HS_REGEX = /^\d{4}\.\d{2}\.\d{2}\.\d{2}$/;

export const LigneDeclarationSchema = z.object({
  section: z.string(),
  section_label: z.string(),
  num: z.number(),
  hs: z.string().regex(HS_REGEX),
  designation_taric: z.string(),
  produits_absorbes: z.string(),
  type_produit: z.string(),
  qte: z.number(),
  poids_kg: z.number(),
  pu_fcfa: z.number(),
  valeur_fcfa: z.number(),
  valeur_eur: z.number(),
  preference: z.union([z.literal(100), z.literal(200)]),
  // Fractions (0.055 = 5,5 %), pas des pourcentages — format confirmé sur les
  // fichiers réels déjà envoyés au transitaire.
  droit_pct: z.number(),
  droit_eur: z.number(),
  tva_pct: z.number(),
  base_tva_eur: z.number(),
  tva_eur: z.number(),
  // Trace optionnelle quand le HS attribué diffère du HS source du packing
  // brut (audit douanier) — voir prompt système, section GARDE-FOUS.
  commentaire_hs: z.string().optional(),
});

export const MetaDeclarationSchema = z.object({
  mawb: z.string(),
  date_vol: z.string(),
  poids_lta_kg: z.number(),
  valeur_totale_fcfa: z.number(),
  valeur_totale_eur: z.number(),
  nb_lignes_regroupees: z.number(),
  nb_lignes_brutes: z.number(),
  economie_transitaire_eur: z.number(),
  part_rex_pct: z.number(),
  droits_totaux_eur: z.number(),
  tva_totale_eur: z.number(),
});

export const SyntheseTvaSchema = z.object({
  base_5_5_eur: z.number(),
  tva_5_5_eur: z.number(),
  base_10_eur: z.number(),
  tva_10_eur: z.number(),
  base_20_eur: z.number(),
  tva_20_eur: z.number(),
});

export const DeclarationFranceSchema = z.object({
  meta: MetaDeclarationSchema,
  lignes: z.array(LigneDeclarationSchema),
  sections_ordre: z.array(z.string()),
  synthese_tva: SyntheseTvaSchema,
  alertes: z.array(z.string()),
});

export type LigneDeclaration = z.infer<typeof LigneDeclarationSchema>;
export type DeclarationFranceIA = z.infer<typeof DeclarationFranceSchema>;
