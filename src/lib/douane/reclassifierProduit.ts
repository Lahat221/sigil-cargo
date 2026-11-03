import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { getOpenAIClient, douaneModel, douaneReasoning } from "./openai";
import { rechercherReferentiel } from "./referentiel";
import { glossaireWolof } from "./glossaire";
import { cleSonore } from "./phonetique";

const HS_CODE_REGEX = /^\d{4}\.\d{2}\.\d{2}\.\d{2}$/;

const CATEGORIES = [
  "Produit alimentaire",
  "Plante séchée",
  "Épice / Condiment",
  "Encens",
  "Produit cosmétique",
  "Vêtement",
  "Chaussures",
  "Textile",
  "Bijoux fantaisie",
  "Maroquinerie",
  "Ustensile de cuisine",
  "Emballage",
  "Appareil électrique",
  "Accessoire",
  "Article divers",
  "Papeterie",
  "Produit divers",
];

const ReclassificationSchema = z.object({
  type_produit: z.string(),
  description_douane: z.string(),
  hs_code: z.string().regex(HS_CODE_REGEX),
  confiance: z.number().min(0).max(1),
  explication: z.string(),
});

export type Reclassification = z.infer<typeof ReclassificationSchema> & {
  source: "referentiel" | "ia";
  /** Nom à employer si le produit est connu du référentiel sous un autre nom (synonyme, ex. « ande »). */
  nom_canonique?: string;
};

/**
 * Reclassifie UN SEUL produit à partir de son nom local corrigé (bouton
 * "Relancer" de l'écran douane) — distinct de reanalyserColis() qui relance
 * l'extraction complète du colis à partir de la description brute. Priorité
 * au référentiel (règle 11 du prompt principal) : si le nom corrigé
 * correspond déjà à une entrée active, on la renvoie directement sans appel
 * IA (gratuit, instantané, et cohérent avec ce que "Corriger et enregistrer
 * dans le référentiel" vient d'y mettre).
 */
export async function reclassifierProduit(
  supabase: SupabaseClient<Database>,
  nomLocal: string
): Promise<{ error: string } | Reclassification> {
  const nom = nomLocal.trim();
  if (!nom) return { error: "Indique un nom de produit." };

  const matches = await rechercherReferentiel(supabase, nom);
  // Même nom (ou synonyme, à la graphie près : ande / anndé) qu'une entrée du référentiel.
  const cle = cleSonore(nom);
  const matchExact = matches.find((m) =>
    [m.nom_local, ...(m.synonymes ?? [])].some((n) => cleSonore(n) === cle)
  );
  if (matchExact?.hs_code) {
    const parSynonyme = cleSonore(matchExact.nom_local) !== cle;
    return {
      type_produit: matchExact.type_produit,
      description_douane: matchExact.description_douane,
      hs_code: matchExact.hs_code,
      confiance: 0.99,
      source: "referentiel",
      explication: `« ${nom} » est connu de votre référentiel${
        parSynonyme ? ` (c'est un autre nom de « ${matchExact.nom_local} »)` : ""
      } : le classement déjà validé par un agent a été repris tel quel, sans estimation de l'IA.`,
      ...(parSynonyme ? { nom_canonique: matchExact.nom_local } : {}),
    };
  }

  const referentielBlock =
    matches.length > 0
      ? matches
          .map(
            (r) =>
              `- "${r.nom_local}" (${r.type_produit}) : ${r.description_douane}${
                r.hs_code ? ` — HS proposé par le référentiel : ${r.hs_code}` : ""
              }`
          )
          .join("\n")
      : "(aucune correspondance trouvée dans le référentiel)";

  const client = getOpenAIClient();
  const response = await client.responses.parse({
    model: douaneModel(),
    ...douaneReasoning(),
    input: [
      {
        role: "system",
        content: `Tu es l'assistant de classification douanière d'une société de transport de colis entre le
Sénégal et la France. On te donne le nom LOCAL d'un seul produit (corrigé à la main par un agent) et tu dois
le classer pour préparer une déclaration douanière — une seule ligne, pas une liste.

${glossaireWolof()}

RÈGLES :
1. Corrige silencieusement les fautes d'orthographe et graphies phonétiques courantes (produits sénégalais :
   bouye, maad, thiakry, thiéré, araw, bissap, thiouraye, boubou, sankal, etc.).
2. "type_produit" : utilise en priorité une de ces catégories, sans en inventer inutilement :
   ${CATEGORIES.join(", ")}.
3. "hs_code" : OBLIGATOIRE, jamais vide, même en cas d'incertitude — propose ta meilleure estimation. Format
   exact à 10 chiffres : 4 chiffres, point, 2 chiffres, point, 2 chiffres, point, 2 chiffres (ex:
   "6309.00.00.00"). Si tu es sûr de la position à 6 chiffres mais pas de la sous-position nationale,
   complète avec ".00.00".
4. "confiance" (0 à 1) reflète ta certitude réelle — jamais artificiellement haute pour un nom ambigu.
5. "description_douane" : description factuelle du produit telle qu'elle apparaîtrait sur une déclaration
   (pas le nom local lui-même).
6. "explication" : 1 à 2 phrases en français, simples, pour l'agent : ce que tu as compris du produit (nature,
   matière, usage) et pourquoi cette position tarifaire et cette description. Si le nom est ambigu ou inconnu,
   dis-le clairement et dis ce qu'il faut vérifier.`,
      },
      {
        role: "user",
        content: `Référentiel interne pertinent :\n${referentielBlock}\n\nNom local du produit à classer :\n"""${nom}"""`,
      },
    ],
    text: { format: zodTextFormat(ReclassificationSchema, "reclassification_produit") },
  });

  const resultat = response.output_parsed;
  if (!resultat) return { error: "Réponse IA vide ou hors-schéma." };

  return { ...resultat, source: "ia" };
}
