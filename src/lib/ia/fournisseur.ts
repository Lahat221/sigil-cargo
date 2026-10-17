// Choix du fournisseur d'IA par usage.
//  - Documents France (audit + génération finale) : toujours Claude, sans
//    passer par ici (traitement sensible, voir src/lib/dedouanement-france).
//  - Analyse des produits douaniers (codes HS, extraction, premiers risques) :
//    OpenAI, via src/lib/douane/openai.ts.
//  - Lecture des LTA : OpenAI par défaut.
//  - Agent WhatsApp : Claude par défaut.
// Chaque usage ci-dessous se règle par variable d'environnement
// (IA_LTA_FOURNISSEUR, IA_AGENT_FOURNISSEUR = openai | anthropic) ; si la clé
// du fournisseur voulu manque, l'autre clé disponible prend le relais.

export type FournisseurIA = "openai" | "anthropic";
export type UsageIA = "agent" | "lta";

const REGLAGES: Record<UsageIA, { variable: string; defaut: FournisseurIA }> = {
  agent: { variable: "IA_AGENT_FOURNISSEUR", defaut: "anthropic" },
  lta: { variable: "IA_LTA_FOURNISSEUR", defaut: "openai" },
};

export function fournisseurIA(usage: UsageIA): FournisseurIA | null {
  const { variable, defaut } = REGLAGES[usage];
  const brut = process.env[variable]?.trim().toLowerCase();
  const voulu: FournisseurIA = brut === "openai" || brut === "anthropic" ? brut : defaut;
  const dispo = {
    openai: !!process.env.OPENAI_API_KEY,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
  };
  if (dispo[voulu]) return voulu;
  const autre: FournisseurIA = voulu === "openai" ? "anthropic" : "openai";
  return dispo[autre] ? autre : null;
}

export function iaConfiguree(usage: UsageIA): boolean {
  return fournisseurIA(usage) !== null;
}

// Modèles OpenAI par usage, surchargeables par variable d'environnement.
const MODELES_OPENAI: Record<UsageIA, { variable: string; defaut: string }> = {
  agent: { variable: "OPENAI_AGENT_MODEL", defaut: "gpt-4.1" },
  lta: { variable: "OPENAI_LTA_MODEL", defaut: "gpt-4.1" },
};

export function modeleOpenAI(usage: UsageIA): string {
  const { variable, defaut } = MODELES_OPENAI[usage];
  return process.env[variable]?.trim() || defaut;
}

/**
 * Les modèles « raisonnement » (gpt-5*, o*) acceptent reasoning_effort ; les
 * autres (gpt-4.x) le refusent. Avec des outils, gpt-5.x exige « none ».
 */
export function optionsRaisonnement(
  modele: string,
  avecOutils = false
): { reasoning_effort?: "none" | "minimal" | "low" } {
  if (/^gpt-5\.\d/.test(modele)) return { reasoning_effort: avecOutils ? "none" : "low" };
  if (/^gpt-5/.test(modele)) return { reasoning_effort: avecOutils ? "minimal" : "low" };
  if (/^o\d/.test(modele)) return { reasoning_effort: "low" };
  return {};
}

/**
 * Message lisible pour une erreur d'API d'IA (OpenAI ou Anthropic) : les cas
 * fréquents (crédit épuisé, clé invalide, surcharge) sont expliqués avec la
 * marche à suivre, au lieu de renvoyer le JSON brut de l'API.
 */
export function messageErreurIA(err: unknown): string {
  const brut = err instanceof Error ? err.message : String(err);
  const texte = brut.toLowerCase();
  if (texte.includes("credit balance is too low")) {
    return "le crédit du compte Anthropic (API) est épuisé. Rechargez-le sur console.anthropic.com → Plans & Billing.";
  }
  if (texte.includes("insufficient_quota") || texte.includes("exceeded your current quota")) {
    return "le crédit du compte OpenAI est épuisé. Rechargez-le sur platform.openai.com → Billing.";
  }
  if (
    texte.includes("invalid x-api-key") ||
    texte.includes("incorrect api key") ||
    texte.includes("invalid_api_key") ||
    texte.includes("authentication_error") ||
    texte.startsWith("401")
  ) {
    return "la clé API de l'IA est invalide ou expirée.";
  }
  if (texte.includes("rate_limit") || texte.includes("rate limit") || texte.startsWith("429")) {
    return "trop de demandes à l'IA en même temps, réessayez dans une minute.";
  }
  if (texte.includes("overloaded") || texte.startsWith("529") || texte.startsWith("503")) {
    return "le service d'IA est momentanément surchargé, réessayez dans quelques minutes.";
  }
  if (texte.includes("model") && (texte.includes("does not exist") || texte.includes("not found"))) {
    return "le modèle d'IA configuré n'existe pas ou n'est pas accessible avec cette clé.";
  }
  return brut;
}
