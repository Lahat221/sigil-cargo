/**
 * Clé « sonore » d'un mot : gomme les variantes d'écriture courantes des mots
 * wolof saisis au guichet (accents, y/i, ou/u, th/t, c/k/q, h muet, lettres
 * doublées) pour qu'un même produit écrit de plusieurs façons soit reconnu —
 * thiakry / thiakri / tiakry, nététou / netetou / neteetou, soumpou / soumpu,
 * mbouraké / mbourake / mbouraque.
 */
export function cleSonore(texte: string): string {
  return texte
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ph/g, "f")
    .replace(/th/g, "t")
    .replace(/ck/g, "k")
    .replace(/qu?/g, "k")
    .replace(/c(?!h)/g, "k")
    .replace(/ou/g, "u")
    .replace(/y/g, "i")
    .replace(/h/g, "")
    .replace(/(.)\1+/g, "$1");
}
