// Prix approximatifs par million de tokens (USD) pour donner un ordre de
// grandeur du coût réel — mêmes principes que src/lib/douane/cout.ts. Un
// modèle absent de cette table ne bloque rien, le coût reste juste non
// estimé (null) plutôt que faux.
const PRIX_PAR_MILLION_TOKENS: Record<string, { entree: number; sortie: number }> = {
  "claude-sonnet-5": { entree: 3, sortie: 15 },
  "claude-opus-5": { entree: 15, sortie: 75 },
  "claude-haiku-4-5-20251001": { entree: 0.8, sortie: 4 },
};

export function estimerCoutUsd(
  modele: string,
  tokensEntree: number | null | undefined,
  tokensSortie: number | null | undefined
): number | null {
  const prix = PRIX_PAR_MILLION_TOKENS[modele];
  if (!prix || tokensEntree == null || tokensSortie == null) return null;
  const cout = (tokensEntree / 1_000_000) * prix.entree + (tokensSortie / 1_000_000) * prix.sortie;
  return Math.round(cout * 100000) / 100000;
}
