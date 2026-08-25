import type { ZodType } from "zod";
import { getAnthropicClient, anthropicModel } from "./anthropic";
import { SIGIL_SYSTEM_PROMPT, PROMPT_VERSION } from "./promptSysteme";
import { DeclarationFranceSchema, AuditReportSchema, type DeclarationFranceIA, type AuditReport } from "./schema";
import { validerDeclarationFrance } from "./validation";
import { estimerCoutUsd } from "./cout";
import type { LigneProduitFrance } from "./lignesFrance";

const MAX_TENTATIVES = 3; // appel initial + 2 relances

export type InputFrance = {
  mawb: string;
  dateVol: string;
  poidsBrutLtaKg: number | null;
  nombreColis: number;
  dimensions: string;
  lignes: LigneProduitFrance[];
  // Une clé par section de déclaration Dakar (SECTIONS_DECLARATION :
  // alimentaire, vetements, maroquinerie, cosmetiques, bijoux, divers).
  sousTotauxFcfa: Record<string, number | null>;
};

type ResultatAppel<T> =
  | {
      ok: true;
      data: T;
      modele: string;
      tokensEntree: number | null;
      tokensSortie: number | null;
      coutEstimeUsd: number | null;
    }
  | { ok: false; erreur: string };

export type ResultatGeneration = ResultatAppel<DeclarationFranceIA>;
export type ResultatAudit = ResultatAppel<AuditReport>;

function construirePromptUser(input: InputFrance, mode: "audit" | "final"): string {
  const packing = {
    mawb: input.mawb,
    date_vol: input.dateVol,
    poids_brut_lta_kg: input.poidsBrutLtaKg,
    nombre_colis: input.nombreColis,
    dimensions: input.dimensions,
    packing_valide_par_utilisateur: {
      sous_totaux_fcfa: input.sousTotauxFcfa,
      lignes: input.lignes.map((l, i) => ({
        num_source: i + 1,
        type_produit: l.typeProduit,
        description_douane: l.descriptionDouane,
        hs_source: l.hsCode ?? "à préciser",
        description_produit: l.descriptionProduit,
        quantite: l.quantite,
      })),
    },
    mode,
  };

  const consigne =
    mode === "audit"
      ? "Produis le rapport d'audit (mode \"audit\") selon tes règles."
      : "Les lignes exclues par l'utilisateur suite à l'audit ne sont plus présentes ci-dessus. Produis le JSON de déclaration douanière finale (mode \"final\") selon tes règles.";

  return `Voici l'expédition à traiter (${input.lignes.length} lignes) :

${JSON.stringify(packing, null, 2)}

${consigne}`;
}

function extraireJson(texte: string): unknown {
  const nettoye = texte
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "");
  return JSON.parse(nettoye);
}

async function appellerClaudeJson<T>(params: {
  userPrompt: string;
  schema: ZodType<T>;
  validerMetier?: (data: T) => string[];
}): Promise<ResultatAppel<T>> {
  const client = getAnthropicClient();
  const modele = anthropicModel();

  const messages: { role: "user" | "assistant"; content: string }[] = [
    { role: "user", content: params.userPrompt },
  ];

  let tokensEntreeTotal = 0;
  let tokensSortieTotal = 0;
  let derniereErreur = "Erreur inconnue.";

  for (let tentative = 0; tentative < MAX_TENTATIVES; tentative++) {
    let texteReponse: string;
    try {
      const reponse = await client.messages
        .stream({
          model: modele,
          max_tokens: 32000,
          output_config: { effort: "low" },
          system: [
            {
              type: "text",
              text: SIGIL_SYSTEM_PROMPT,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages,
        })
        .finalMessage();

      tokensEntreeTotal += reponse.usage?.input_tokens ?? 0;
      tokensSortieTotal += reponse.usage?.output_tokens ?? 0;

      const blocTexte = reponse.content.find((b) => b.type === "text");
      if (!blocTexte || blocTexte.type !== "text") {
        const blocs = reponse.content.map((b) => b.type).join(",") || "aucun";
        derniereErreur = `Réponse IA sans contenu texte (stop_reason: ${reponse.stop_reason}, blocs: ${blocs}).`;
        break;
      }
      texteReponse = blocTexte.text;
    } catch (err) {
      derniereErreur = err instanceof Error ? err.message : "Erreur d'appel à l'API Claude.";
      break;
    }

    let json: unknown;
    try {
      json = extraireJson(texteReponse);
    } catch {
      derniereErreur = "Réponse IA : JSON invalide (non parsable).";
      messages.push({ role: "assistant", content: texteReponse });
      messages.push({
        role: "user",
        content:
          "Ta réponse n'était pas un JSON valide. Renvoie UNIQUEMENT le JSON corrigé, sans texte ni markdown autour.",
      });
      continue;
    }

    const parsed = params.schema.safeParse(json);
    if (!parsed.success) {
      derniereErreur = `Réponse IA hors-schéma : ${parsed.error.issues.slice(0, 3).map((i) => i.message).join(" / ")}`;
      messages.push({ role: "assistant", content: texteReponse });
      messages.push({
        role: "user",
        content: `Le JSON ne respecte pas le schéma attendu : ${derniereErreur}. Renvoie UNIQUEMENT le JSON corrigé, sans texte ni markdown autour.`,
      });
      continue;
    }

    const erreursMetier = params.validerMetier?.(parsed.data) ?? [];
    if (erreursMetier.length > 0) {
      derniereErreur = erreursMetier.join(" / ");
      messages.push({ role: "assistant", content: texteReponse });
      messages.push({
        role: "user",
        content: `Le JSON ne respecte pas les règles métier : ${derniereErreur}. Corrige et renvoie UNIQUEMENT le JSON corrigé, sans texte ni markdown autour.`,
      });
      continue;
    }

    return {
      ok: true,
      data: parsed.data,
      modele,
      tokensEntree: tokensEntreeTotal || null,
      tokensSortie: tokensSortieTotal || null,
      coutEstimeUsd: estimerCoutUsd(modele, tokensEntreeTotal, tokensSortieTotal),
    };
  }

  return { ok: false, erreur: derniereErreur };
}

/**
 * Phase A du prompt v2 — rapport d'audit (produits à risque, cohérence
 * valeur/poids, regroupement proposé) à faire valider par l'utilisateur
 * avant de payer le coût d'une génération finale.
 */
export async function genererAuditFrance(input: InputFrance): Promise<ResultatAudit> {
  return appellerClaudeJson({
    userPrompt: construirePromptUser(input, "audit"),
    schema: AuditReportSchema,
  });
}

/**
 * Phase B du prompt v2 — JSON final prêt pour les 3 fichiers Excel.
 * `input.lignes` doit déjà refléter les exclusions décidées par
 * l'utilisateur (le prompt système ne reçoit jamais les lignes exclues).
 */
export async function genererDeclarationFrance(input: InputFrance): Promise<ResultatGeneration> {
  return appellerClaudeJson({
    userPrompt: construirePromptUser(input, "final"),
    schema: DeclarationFranceSchema,
    validerMetier: (data) => validerDeclarationFrance(data, input.poidsBrutLtaKg, input.sousTotauxFcfa),
  });
}

export { PROMPT_VERSION };
