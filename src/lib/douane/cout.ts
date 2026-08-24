// Prix approximatifs par million de tokens (USD), pour donner un ordre de
// grandeur du coût réel de l'automatisation (section 35 du cahier des
// charges). À ajuster si OpenAI change ses tarifs ou si un autre modèle est
// utilisé via OPENAI_DOUANE_MODEL — un modèle absent de cette table ne
// bloque rien, le coût reste simplement non estimé (null) plutôt que faux.
const PRIX_PAR_MILLION_TOKENS: Record<string, { entree: number; sortie: number }> = {
  "gpt-4o-mini": { entree: 0.15, sortie: 0.6 },
  "gpt-4o": { entree: 2.5, sortie: 10 },
  "gpt-4.1": { entree: 2, sortie: 8 },
  "gpt-4.1-mini": { entree: 0.4, sortie: 1.6 },
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
