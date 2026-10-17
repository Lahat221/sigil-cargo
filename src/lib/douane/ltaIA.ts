import { anthropicModel, getAnthropicClient } from "@/lib/dedouanement-france/anthropic";
import { getOpenAIClient } from "@/lib/douane/openai";
import { fournisseurIA, modeleOpenAI } from "@/lib/ia/fournisseur";

export const PROMPT_LECTURE_LTA = `Tu regardes UNIQUEMENT la première page de ce document. Extrait les informations suivantes de cette LTA (Lettre de Transport Aérien) et réponds UNIQUEMENT en JSON valide, sans markdown, sans explication :
{
  "mawb": "numéro MAWB (ex: 490-02087654)",
  "date_vol": "date de vol au format JJ-MM-AAAA",
  "poids_brut_kg": nombre décimal (poids brut en kg),
  "nombre_colis": nombre entier,
  "dimensions": "dimensions (ex: 120x100x95 cm)"
}
Si un champ est absent ou illisible, mets null. N'invente rien : mieux vaut null qu'une valeur incertaine.`;

export type FichierLta = {
  base64: string;
  estPdf: boolean;
  /** Type MIME de l'image quand ce n'est pas un PDF. */
  typeImage: string | null;
};

/** Envoie la LTA à l'IA et renvoie sa réponse brute (JSON attendu). */
export async function lireLtaAvecIA(fichier: FichierLta): Promise<string> {
  const fournisseur = fournisseurIA("lta");
  if (!fournisseur) throw new Error("Aucune clé d'IA configurée (OPENAI_API_KEY).");

  if (fournisseur === "openai") {
    const reponse = await getOpenAIClient().chat.completions.create({
      model: modeleOpenAI("lta"),
      max_completion_tokens: 600,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            fichier.estPdf
              ? {
                  type: "file",
                  file: {
                    filename: "lta.pdf",
                    file_data: `data:application/pdf;base64,${fichier.base64}`,
                  },
                }
              : {
                  type: "image_url",
                  image_url: { url: `data:${fichier.typeImage};base64,${fichier.base64}` },
                },
            { type: "text", text: PROMPT_LECTURE_LTA },
          ],
        },
      ],
    });
    return reponse.choices[0]?.message?.content ?? "";
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contentBlocks: any[] = [
    fichier.estPdf
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: fichier.base64 } }
      : { type: "image", source: { type: "base64", media_type: fichier.typeImage, data: fichier.base64 } },
    { type: "text", text: PROMPT_LECTURE_LTA },
  ];
  const response = await getAnthropicClient().messages.create({
    model: anthropicModel(),
    max_tokens: 512,
    messages: [{ role: "user", content: contentBlocks }],
  });
  return response.content.find((b) => b.type === "text")?.text ?? "";
}
