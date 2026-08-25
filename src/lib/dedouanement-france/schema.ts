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
  // Niveau de confiance de l'IA sur l'estimation PU/poids de cette ligne
  // (prompt v2, section 8.3) — informatif, jamais bloquant.
  estimation_confiance: z.enum(["haute", "moyenne", "basse"]).optional(),
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
  // Mail rédigé par l'IA (prompt v2, section 13) — préféré au template
  // mail.ts quand présent ; absent sur les anciennes générations persistées
  // (rétro-compatibilité de regenererDepuisDernierJson).
  mail_transitaire: z.string().optional(),
  // Résumé des retraits/reclassements appliqués suite à l'audit — purement
  // informatif, affiché dans le récap.
  actions_utilisateur_appliquees: z.array(z.string()).optional(),
});

export type LigneDeclaration = z.infer<typeof LigneDeclarationSchema>;
export type DeclarationFranceIA = z.infer<typeof DeclarationFranceSchema>;

// ═══ Rapport d'audit (mode "audit", prompt v2 section 8.1) ═══
// Produit AVANT la génération finale — permet de repérer les produits à
// risque et les écarts de valeur/poids avant de payer le coût d'un appel de
// génération complète. Validation Zod uniquement (pas d'invariants métier
// durs comme validerDeclarationFrance : c'est un rapport, pas un document
// final).

const AlerteAuditSchema = z.object({
  niveau: z.string(),
  ligne_source: z.number().optional(),
  lignes_source: z.array(z.number()).optional(),
  produit: z.string(),
  hs: z.string().optional(),
  hs_source: z.string().optional(),
  raison: z.string(),
  action_recommandee: z.string(),
});

const CoherenceValeurSectionSchema = z.object({
  sous_total_fourni_fcfa: z.number(),
  estimation_produits_fcfa: z.number(),
  ecart_pct: z.number(),
  verdict: z.string(),
});

export const AuditReportSchema = z.object({
  mode: z.literal("audit"),
  resume_expedition: z.object({
    mawb: z.string(),
    date_vol: z.string(),
    poids_lta_kg: z.number(),
    valeur_totale_declaree_fcfa: z.number(),
    valeur_totale_declaree_eur: z.number(),
    nb_lignes_brutes: z.number(),
  }),
  alertes_critiques: z.array(AlerteAuditSchema),
  alertes_reglementation: z.array(AlerteAuditSchema),
  alertes_ambigues: z.array(AlerteAuditSchema),
  estimation_valeurs_poids: z.object({
    methode: z.string(),
    coherence_valeurs: z.record(z.string(), CoherenceValeurSectionSchema),
    coherence_poids: z.object({
      poids_lta_kg: z.number(),
      somme_estimee_kg: z.number(),
      ecart_kg: z.number(),
      ecart_pct: z.number(),
      verdict: z.string(),
    }),
  }),
  regroupement_propose: z.object({
    nb_lignes_brutes: z.number(),
    nb_lignes_apres_retrait_et_regroupement: z.number(),
    economie_transitaire_eur: z.number(),
    part_rex_pct: z.number(),
    lignes_apercu: z.array(
      z.object({
        section: z.string(),
        hs: z.string(),
        produits: z.string(),
        qte: z.number(),
        poids_kg: z.number(),
        val_fcfa: z.number(),
        preference: z.union([z.literal(100), z.literal(200)]),
      })
    ),
  }),
  questions_a_l_utilisateur: z.array(z.string()),
  recommandation_finale: z.string(),
});

export type AuditReport = z.infer<typeof AuditReportSchema>;
