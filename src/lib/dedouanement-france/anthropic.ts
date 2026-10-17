import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY n'est pas configuré.");
  }
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export function anthropicModel(): string {
  return process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
}

/**
 * Message lisible pour une erreur de l'API Anthropic — les cas fréquents
 * (crédit épuisé, clé invalide, surcharge) sont expliqués avec la marche à
 * suivre, au lieu de renvoyer le JSON brut de l'API.
 */
export function messageErreurAnthropic(err: unknown): string {
  const brut = err instanceof Error ? err.message : String(err);
  const texte = brut.toLowerCase();
  if (texte.includes("credit balance is too low")) {
    return "le crédit du compte Anthropic (API) est épuisé. Rechargez-le sur console.anthropic.com → Plans & Billing.";
  }
  if (texte.includes("invalid x-api-key") || texte.includes("authentication_error") || texte.startsWith("401")) {
    return "la clé API Anthropic est invalide ou expirée.";
  }
  if (texte.includes("rate_limit") || texte.startsWith("429")) {
    return "trop de demandes à l'IA en même temps, réessayez dans une minute.";
  }
  if (texte.includes("overloaded") || texte.startsWith("529")) {
    return "le service d'IA est momentanément surchargé, réessayez dans quelques minutes.";
  }
  return brut;
}
