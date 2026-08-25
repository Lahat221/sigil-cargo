import { getAnthropicClient, anthropicModel } from "./anthropic";
import { SIGIL_SYSTEM_PROMPT, PROMPT_VERSION } from "./promptSysteme";
import { DeclarationFranceSchema, type DeclarationFranceIA } from "./schema";
import { validerDeclarationFrance } from "./validation";
import { estimerCoutUsd } from "./cout";
import type { LigneProduitFrance } from "./lignesFrance";

const MAX_TENTATIVES = 3; // appel initial + 2 relances

export type ResultatGeneration =
  | {
      ok: true;
      data: DeclarationFranceIA;
      modele: string;
      tokensEntree: number | null;
      tokensSortie: number | null;
      coutEstimeUsd: number | null;
    }
  | { ok: false; erreur: string };

function construirePromptUser(input: {
  mawb: string;
  dateVol: string;
  poidsBrutLtaKg: number | null;
  lignes: LigneProduitFrance[];
  sousTotauxFcfa: { agro: number | null; vetements: number | null; divers: number | null };
}): string {
  const csvLignes = input.lignes
    .map((l, i) => {
      const cols = [
        String(i + 1),
        l.typeProduit,
        l.descriptionDouane,
        l.hsCode ?? "à préciser",
        l.descriptionProduit,
        String(l.quantite),
        "0",
      ];
      return cols.join(";");
    })
    .join("\n");

  return `Voici l'expédition à traiter :

MAWB : ${input.mawb}
Date vol : ${input.dateVol}
Poids brut LTA : ${input.poidsBrutLtaKg ?? "non renseigné"} kg
Sous-totaux packing brut (FCFA) :
- Section agro : ${input.sousTotauxFcfa.agro ?? "non renseigné"}
- Section vêtements/textiles : ${input.sousTotauxFcfa.vetements ?? "non renseigné"}
- Section bijoux/maroquinerie/divers : ${input.sousTotauxFcfa.divers ?? "non renseigné"}

PACKING BRUT (${input.lignes.length} lignes — les lignes exclues par l'utilisateur ne sont pas incluses ici) :
\`\`\`csv
ligne;type;description_douane;hs_source;produit;qte;poids_kg
${csvLignes}
\`\`\`

Produis le JSON de déclaration douanière optimisée selon tes règles.`;
}

function extraireJson(texte: string): unknown {
  const nettoye = texte
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "");
  return JSON.parse(nettoye);
}

export async function genererDeclarationFrance(input: {
  mawb: string;
  dateVol: string;
  poidsBrutLtaKg: number | null;
  lignes: LigneProduitFrance[];
  sousTotauxFcfa: { agro: number | null; vetements: number | null; divers: number | null };
}): Promise<ResultatGeneration> {
  const client = getAnthropicClient();
  const modele = anthropicModel();
  const userPrompt = construirePromptUser(input);

  const messages: { role: "user" | "assistant"; content: string }[] = [
    { role: "user", content: userPrompt },
  ];

  let tokensEntreeTotal = 0;
  let tokensSortieTotal = 0;
  let derniereErreur = "Erreur inconnue.";

  for (let tentative = 0; tentative < MAX_TENTATIVES; tentative++) {
    let texteReponse: string;
    try {
      const reponse = await client.messages.create({
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
      });

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

    const parsed = DeclarationFranceSchema.safeParse(json);
    if (!parsed.success) {
      derniereErreur = `Réponse IA hors-schéma : ${parsed.error.issues.slice(0, 3).map((i) => i.message).join(" / ")}`;
      messages.push({ role: "assistant", content: texteReponse });
      messages.push({
        role: "user",
        content: `Le JSON ne respecte pas le schéma attendu : ${derniereErreur}. Renvoie UNIQUEMENT le JSON corrigé, sans texte ni markdown autour.`,
      });
      continue;
    }

    const erreursMetier = validerDeclarationFrance(parsed.data, input.poidsBrutLtaKg, input.sousTotauxFcfa);
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

export { PROMPT_VERSION };
