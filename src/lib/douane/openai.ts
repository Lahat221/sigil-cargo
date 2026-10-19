import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY n'est pas configuré.");
  }
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export function douaneModel(): string {
  // gpt-5.4 : mesuré sur vos corrections de codes HS, un peu plus juste que
// gpt-4o-mini sur la famille du code (position à 4 chiffres) et le code à 6
// chiffres, au prix d'environ 3x plus de temps par colis (~11 s).
  return process.env.OPENAI_DOUANE_MODEL || "gpt-5.4";
}

export function confidenceThreshold(): number {
  const raw = process.env.DOUANE_CONFIDENCE_THRESHOLD;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : 0.85;
}

/**
 * Réglage de réflexion des modèles gpt-5* / o* (API Responses) : plus la
 * réflexion est poussée, plus la classification est soignée, mais plus c'est
 * lent. Valeur par défaut « low » ; OPENAI_DOUANE_REASONING
 * (none | low | medium | high) pour l'ajuster. Ignoré pour gpt-4*.
 */
export function douaneReasoning(
  modele: string = douaneModel()
): { reasoning: { effort: "none" | "low" | "medium" | "high" } } | Record<string, never> {
  if (!/^(gpt-5|o\d)/.test(modele)) return {};
  const brut = process.env.OPENAI_DOUANE_REASONING?.trim().toLowerCase();
  const effort = brut === "none" || brut === "low" || brut === "medium" || brut === "high" ? brut : "low";
  return { reasoning: { effort } };
}
